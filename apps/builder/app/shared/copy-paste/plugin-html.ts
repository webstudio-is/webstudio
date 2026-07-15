import type { WebstudioFragment } from "@webstudio-is/sdk";
import { generateFragmentFromHtml } from "@webstudio-is/project-build/runtime";
import { generateFragmentFromTailwind } from "../tailwind/tailwind";
import { denormalizeSrcProps } from "./asset-upload";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import { builderApi } from "../builder-api";
import {
  hasFragmentData,
  insertFragmentWithBreakpointWarning,
} from "./fragment-utils";

const inceptionMark = `<!-- @webstudio/inception/1 -->`;

const handlePasteHtml = async (html: string) => {
  const parseResult = generateFragmentFromHtml(html);
  const { skippedSelectors } = parseResult;
  let fragment: WebstudioFragment = parseResult;
  if (hasFragmentData(fragment) === false) {
    return pasteIgnored;
  }
  fragment = await denormalizeSrcProps(fragment);
  if (html.includes(inceptionMark)) {
    fragment = await generateFragmentFromTailwind(fragment);
  }
  insertFragmentWithBreakpointWarning(fragment);
  if (skippedSelectors.length > 0) {
    builderApi.toast.info(
      `Skipped nested selectors (no matching elements): ${skippedSelectors.join(", ")}`
    );
  }
  return pasteHandled;
};

export const html: Plugin = {
  name: "html",
  mimeType: "text/plain",
  onPaste: handlePasteHtml,
};
