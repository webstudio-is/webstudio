import { webstudioFragment, type WebstudioFragment } from "@webstudio-is/sdk";
import { evaluateWebstudioJsxFragment } from "./fragment.server";
import { inspectWebstudioJsxFragmentSyntax } from "./syntax";
export { isLikelyWebstudioJsxFragment } from "./utils";

export const parseWebstudioJsxFragment = async (
  source: string
): Promise<WebstudioFragment> => {
  inspectWebstudioJsxFragmentSyntax(source);
  const fragment = await evaluateWebstudioJsxFragment(source);
  return webstudioFragment.parse(fragment);
};
