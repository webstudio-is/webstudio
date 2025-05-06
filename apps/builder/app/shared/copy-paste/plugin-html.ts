import { isFeatureEnabled } from "@webstudio-is/feature-flags";
import { generateFragmentFromHtml } from "../html";
import { insertWebstudioFragmentAt } from "../instance-utils";
import type { Plugin } from "./init-copy-paste";

export const html: Plugin = {
  mimeType: "text/plain",
  onPaste: (html: string) => {
    if (!isFeatureEnabled("element")) {
      return false;
    }
    const fragment = generateFragmentFromHtml(html);
    return insertWebstudioFragmentAt(fragment);
  },
};
