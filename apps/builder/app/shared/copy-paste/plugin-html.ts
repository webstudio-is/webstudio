import { generateFragmentFromHtml } from "../html";
import { insertWebstudioFragmentAt } from "../instance-utils";
import type { Plugin } from "./init-copy-paste";

export const html: Plugin = {
  mimeType: "text/plain",
  onPaste: (html: string) => {
    const fragment = generateFragmentFromHtml(html);
    return insertWebstudioFragmentAt(fragment);
  },
};
