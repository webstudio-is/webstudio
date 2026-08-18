import { runInNewContext } from "node:vm";
import { transform } from "esbuild";
import { createElement, Fragment } from "react";
import { getErrorMessage, throwWebstudioJsxValidationError } from "./errors";

type EvaluateJsxOptions = {
  source: string;
  createModule: (source: string) => string;
  transformJsx?: typeof transform;
  transformTimeoutMs?: number;
  globals?: Record<string, unknown>;
  parseErrorMessage?: (error: unknown) => string;
  evaluationErrorMessage?: (error: unknown) => string;
  missingResultMessage?: string;
};

export const evaluateJsx = async <Result>({
  source,
  createModule,
  transformJsx = transform,
  transformTimeoutMs = 5_000,
  globals,
  parseErrorMessage = (error) =>
    `Could not parse JSX. ${getErrorMessage(error)}`,
  evaluationErrorMessage = (error) =>
    `Could not evaluate JSX. ${getErrorMessage(error)}`,
  missingResultMessage = "JSX did not produce a value.",
}: EvaluateJsxOptions): Promise<Result> => {
  let code: string;
  let transformTimeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      transformJsx(createModule(source), {
        loader: "tsx",
        format: "cjs",
        platform: "node",
        jsx: "transform",
        jsxFactory: "createElement",
        jsxFragment: "Fragment",
      }),
      new Promise<never>((_resolve, reject) => {
        transformTimeout = setTimeout(
          () =>
            reject(
              new Error(`JSX transformation exceeded ${transformTimeoutMs}ms.`)
            ),
          transformTimeoutMs
        );
      }),
    ]);
    code = result.code;
  } catch (error) {
    return throwWebstudioJsxValidationError(
      parseErrorMessage(error),
      "valid_webstudio_jsx_syntax",
      getErrorMessage(error)
    );
  } finally {
    clearTimeout(transformTimeout);
  }

  const exports: { default?: Result } = {};
  try {
    runInNewContext(
      code,
      {
        exports,
        createElement,
        Fragment,
        ...globals,
      },
      {
        timeout: 1000,
        contextCodeGeneration: {
          strings: false,
          wasm: false,
        },
      }
    );
  } catch (error) {
    return throwWebstudioJsxValidationError(
      evaluationErrorMessage(error),
      "valid_declarative_webstudio_jsx",
      getErrorMessage(error)
    );
  }

  if (exports.default === undefined) {
    return throwWebstudioJsxValidationError(
      missingResultMessage,
      "webstudio_jsx_fragment_produces_data"
    );
  }

  return exports.default;
};
