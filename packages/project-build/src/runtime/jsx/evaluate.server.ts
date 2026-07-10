import { runInNewContext } from "node:vm";
import { transform } from "esbuild";
import { createElement, Fragment } from "react";
import { throwBuilderRuntimeError } from "../errors";
import { getErrorMessage } from "./errors";

type EvaluateJsxOptions = {
  source: string;
  createModule: (source: string) => string;
  globals?: Record<string, unknown>;
  parseErrorMessage?: (error: unknown) => string;
  evaluationErrorMessage?: (error: unknown) => string;
  missingResultMessage?: string;
};

export const evaluateJsx = async <Result>({
  source,
  createModule,
  globals,
  parseErrorMessage = (error) =>
    `Could not parse JSX. ${getErrorMessage(error)}`,
  evaluationErrorMessage = (error) =>
    `Could not evaluate JSX. ${getErrorMessage(error)}`,
  missingResultMessage = "JSX did not produce a value.",
}: EvaluateJsxOptions): Promise<Result> => {
  let code: string;
  try {
    const result = await transform(createModule(source), {
      loader: "tsx",
      format: "cjs",
      platform: "node",
      jsx: "transform",
      jsxFactory: "createElement",
      jsxFragment: "Fragment",
    });
    code = result.code;
  } catch (error) {
    return throwBuilderRuntimeError("BAD_REQUEST", parseErrorMessage(error));
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
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      evaluationErrorMessage(error)
    );
  }

  if (exports.default === undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", missingResultMessage);
  }

  return exports.default;
};
