import { createId, type WebstudioFragment } from "@webstudio-is/sdk";
import { renderTemplate } from "@webstudio-is/template";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  webstudioJsxAnimationGuidance,
  webstudioJsxBindingGuidance,
  webstudioJsxRuntimeBindings,
} from "./bindings";
import { evaluateJsx } from "./evaluate.server";
import { getErrorMessage } from "./errors";

const templateValidationMessagePrefixes = [
  "Do not use React fragment shorthand",
  "Invalid JSX component",
  "Invalid JSX prop",
  "token()",
  "ws:style",
  "ws:tokens",
  "css templates",
];

const isTemplateValidationMessage = (message: string) =>
  templateValidationMessagePrefixes.some((prefix) =>
    message.startsWith(prefix)
  );

const createWebstudioJsxFragmentIdFactory = () => {
  const salt = createId();
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
      `Could not parse JSX fragment. Pass Webstudio JSX such as <section><Heading tag="h2">Title</Heading></section>. ${getErrorMessage(
        error
      )}`,
    evaluationErrorMessage: (error) => {
      const message = getErrorMessage(error);
      if (isTemplateValidationMessage(message)) {
        return message;
      }
      const animationGuidance =
        message === "animation is not a function"
          ? ` ${webstudioJsxAnimationGuidance}`
          : "";
      return `Could not evaluate JSX fragment. Use ${webstudioJsxBindingGuidance}.${animationGuidance} ${message}`;
    },
    missingResultMessage: "JSX fragment did not produce Webstudio data.",
  });
};
