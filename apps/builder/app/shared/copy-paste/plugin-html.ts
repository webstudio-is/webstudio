import type { WebstudioFragment } from "@webstudio-is/sdk";
import { generateFragmentFromHtml } from "../html";
import { insertWebstudioFragmentAt } from "../instance-utils";
import { generateFragmentFromTailwind } from "../tailwind/tailwind";
import { denormalizeSrcProps } from "./asset-upload";
import type { Plugin } from "./init-copy-paste";
import { builderApi } from "../builder-api";

const inceptionMark = `<!-- @webstudio/inception/1 -->`;

export const html: Plugin = {
  name: "html",
  mimeType: "text/plain",
  onPaste: async (html: string) => {
    const parseResult = generateFragmentFromHtml(html);
    const { skippedSelectors } = parseResult;
    let fragment: WebstudioFragment = parseResult;
    fragment = await denormalizeSrcProps(fragment);
    if (html.includes(inceptionMark)) {
      fragment = await generateFragmentFromTailwind(fragment);
    }
    const result = insertWebstudioFragmentAt(fragment);
    if (skippedSelectors.length > 0) {
      builderApi.toast.info(
        `Skipped nested selectors (no matching elements): ${skippedSelectors.join(", ")}`
      );
    }
    return result;
  },
};
