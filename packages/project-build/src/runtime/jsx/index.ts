import { webstudioFragment, type WebstudioFragment } from "@webstudio-is/sdk";
import { evaluateWebstudioJsxFragment } from "./fragment.server";
export { isLikelyWebstudioJsxFragment } from "./utils";

export const parseWebstudioJsxFragment = async (
  source: string
): Promise<WebstudioFragment> => {
  const fragment = await evaluateWebstudioJsxFragment(source);
  return webstudioFragment.parse(fragment);
};
