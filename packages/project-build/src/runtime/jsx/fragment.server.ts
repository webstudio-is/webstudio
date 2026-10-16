import { createId, type WebstudioFragment } from "@webstudio-is/sdk";
import {
  renderTemplate,
  TemplateValidationError,
} from "@webstudio-is/template";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import { componentIds } from "@webstudio-is/sdk-components-registry/components";
import {
  webstudioJsxBindingGuidance,
  webstudioJsxRuntimeBindings,
} from "./bindings";
import { evaluateJsx } from "./evaluate.server";
import { getErrorMessage } from "./errors";
import { inspectWebstudioJsxFragmentSyntax } from "./syntax";

const createWebstudioJsxFragmentIdFactory = () => {
  const salt = createId();
  let index = 0;
  return () => `__webstudio_jsx_fragment_${salt}_${index++}`;
};

export const evaluateWebstudioJsxFragment = async (
  source: string
): Promise<WebstudioFragment> => {
  inspectWebstudioJsxFragmentSyntax(source);
  const createId = createWebstudioJsxFragmentIdFactory();
  return evaluateJsx<WebstudioFragment>({
    source,
    createModule: (jsx) =>
      `exports.default = __renderTemplate(<>${jsx}</>, __createWebstudioJsxFragmentId, [], { allowManualIds: false, componentIds: __componentIds, componentMetas: __componentMetas });`,
    globals: {
      __createWebstudioJsxFragmentId: createId,
      __componentIds: componentIds,
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
      if (error instanceof TemplateValidationError) {
        return message;
      }
      return `Could not evaluate JSX fragment. Use ${webstudioJsxBindingGuidance}. ${message}`;
    },
    missingResultMessage: "JSX fragment did not produce Webstudio data.",
  });
};
