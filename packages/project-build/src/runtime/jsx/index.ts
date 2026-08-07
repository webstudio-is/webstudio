import { webstudioFragment, type WebstudioFragment } from "@webstudio-is/sdk";
import { evaluateWebstudioJsxFragment } from "./fragment.server";
import { inspectWebstudioJsxFragmentSyntax } from "./syntax";
import { getExpressionErrors } from "../expression-validation";
import { throwBuilderRuntimeError } from "../errors";
export { isLikelyWebstudioJsxFragment } from "./utils";

const enforcedElementChildComponents = new Set([
  "@webstudio-is/sdk-components-react-radix:CollapsibleTrigger",
  "@webstudio-is/sdk-components-react-radix:DialogTrigger",
  "@webstudio-is/sdk-components-react-radix:NavigationMenuLink",
  "@webstudio-is/sdk-components-react-radix:NavigationMenuTrigger",
  "@webstudio-is/sdk-components-react-radix:PopoverTrigger",
  "@webstudio-is/sdk-components-react-radix:TooltipTrigger",
]);

const validateExpression = (value: string, location: string) => {
  const [detail] = getExpressionErrors(value);
  if (detail !== undefined) {
    throwBuilderRuntimeError(
      "BAD_REQUEST",
      `Invalid Webstudio expression at ${location}. ${detail}`
    );
  }
};

const validateWebstudioJsxFragment = (fragment: WebstudioFragment) => {
  for (const instance of fragment.instances) {
    if (
      enforcedElementChildComponents.has(instance.component) &&
      instance.children.some((child) => child.type !== "id")
    ) {
      throwBuilderRuntimeError(
        "BAD_REQUEST",
        `${instance.component} requires an element child. Wrap text or expressions in a Webstudio element such as <ws.element ws:tag="span">...</ws.element>.`
      );
    }
    for (const [childIndex, child] of instance.children.entries()) {
      if (child.type !== "expression") {
        continue;
      }
      validateExpression(
        child.value,
        `instance ${instance.id} child ${childIndex}`
      );
    }
  }
  for (const prop of fragment.props) {
    if (prop.type !== "expression") {
      continue;
    }
    validateExpression(prop.value, `prop ${prop.name}`);
  }
};

export const parseWebstudioJsxFragment = async (
  source: string
): Promise<WebstudioFragment> => {
  inspectWebstudioJsxFragmentSyntax(source);
  const fragment = await evaluateWebstudioJsxFragment(source);
  const parsedFragment = webstudioFragment.parse(fragment);
  validateWebstudioJsxFragment(parsedFragment);
  return parsedFragment;
};
