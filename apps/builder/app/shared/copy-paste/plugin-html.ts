import { generateFragmentFromHtml } from "../html";
import { insertWebstudioFragmentAt } from "../instance-utils";
import { generateFragmentFromTailwind } from "../tailwind/tailwind";
import { denormalizeSrcProps } from "./asset-upload";
import type { Plugin } from "./init-copy-paste";

const inceptionMark = `<!-- @webstudio/inception/1 -->`;

export const html: Plugin = {
  name: "html",
  mimeType: "text/plain",
  onPaste: async (html: string) => {
    let fragment = generateFragmentFromHtml(html);
    fragment = await denormalizeSrcProps(fragment);
    if (html.includes(inceptionMark)) {
      fragment = await generateFragmentFromTailwind(fragment);
    }
    const result = insertWebstudioFragmentAt(fragment);
    return result;
  },
};
