import { generateFragmentFromHtml } from "../html";
import { insertWebstudioFragmentAt } from "../instance-utils";
import { denormalizeSrcProps } from "./asset-upload";
import type { Plugin } from "./init-copy-paste";

export const html: Plugin = {
  name: "html",
  mimeType: "text/plain",
  onPaste: async (html: string) => {
    let fragment = generateFragmentFromHtml(html);
    fragment = await denormalizeSrcProps(fragment);
    const result = insertWebstudioFragmentAt(fragment);
    return result;
  },
};
