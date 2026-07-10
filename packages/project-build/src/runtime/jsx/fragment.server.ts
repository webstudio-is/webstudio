import { randomUUID } from "node:crypto";
import type { WebstudioFragment } from "@webstudio-is/sdk";
import { renderTemplate } from "@webstudio-is/template";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  webstudioJsxFragmentBuiltInHelpers,
  webstudioJsxRuntimeBindings,
} from "./bindings";
import { evaluateJsx } from "./evaluate.server";
import { getErrorMessage } from "./errors";

const templateValidationMessagePrefixes = [
  "Do not use raw HTML tag",
  "Do not use React fragment shorthand",
  "Invalid JSX component",
  "Invalid JSX prop",
  "token()",
  "ws:style",
  "ws:tokens",
];

const isTemplateValidationMessage = (message: string) =>
  templateValidationMessagePrefixes.some((prefix) =>
    message.startsWith(prefix)
  );

const createWebstudioJsxFragmentIdFactory = () => {
  const salt = randomUUID();
  let index = 0;
  return () => `__webstudio_jsx_fragment_${salt}_${index++}`;
};

export const evaluateWebstudioJsxFragment = async (
  source: string
): Promise<WebstudioFragment> => {
  const createId = createWebstudioJsxFragmentIdFactory();
  return evaluateJsx<WebstudioFragment>({
    source,
    createModule: (jsx) =>
      `exports.default = __renderTemplate(<>${jsx}</>, __createWebstudioJsxFragmentId, [], { allowManualIds: false, componentMetas: __componentMetas });`,
    globals: {
      __createWebstudioJsxFragmentId: createId,
      __componentMetas: componentMetas,
      __renderTemplate: renderTemplate,
      ...webstudioJsxRuntimeBindings,
    },
    parseErrorMessage: (error) =>
      `Could not parse JSX fragment. Pass Webstudio JSX such as <$.Box><$.Heading>Title</$.Heading></$.Box>. ${getErrorMessage(error)}`,
    evaluationErrorMessage: (error) => {
      const message = getErrorMessage(error);
      if (isTemplateValidationMessage(message)) {
        return message;
      }
      return `Could not evaluate JSX fragment. Use built-in helpers only: ${webstudioJsxFragmentBuiltInHelpers}. ${message}`;
    },
    missingResultMessage: "JSX fragment did not produce Webstudio data.",
  });
};
