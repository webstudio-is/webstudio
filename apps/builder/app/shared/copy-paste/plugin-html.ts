import { generateFragmentFromHtml } from "../html";
import {
  insertWebstudioFragmentAt,
  insertWebstudioFragmentTokensOnly,
} from "../instance-utils";
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
    // Style-only paste: no instances, just tokens
    if (fragment.children.length === 0 && fragment.styleSources.length > 0) {
      return insertWebstudioFragmentTokensOnly(fragment);
    }
    const result = insertWebstudioFragmentAt(fragment);
    return result;
  },
};
