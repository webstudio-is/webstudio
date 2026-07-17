import { gfm, gfmHtml } from "micromark-extension-gfm";
import { micromark } from "micromark";
import { denormalizeSrcProps } from "./asset-upload";
import { generateFragmentFromHtml } from "@webstudio-is/project-build/runtime";
import { pasteHandled, pasteIgnored, type Plugin } from "./copy-paste";
import {
  hasFragmentData,
  insertFragmentWithBreakpointWarning,
} from "./fragment-utils";

const parse = (clipboardData: string) => {
  const html = micromark(clipboardData, "utf-8", {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
  const { skippedSelectors: _skipped, ...fragment } =
    generateFragmentFromHtml(html);
  const instances = new Map(fragment.instances.map((item) => [item.id, item]));
  for (const instance of fragment.instances) {
    if (instance.tag === "img") {
      delete instance.tag;
      instance.component = "Image";
    }
  }
  fragment.instances = Array.from(instances.values());
  return fragment;
};

const handlePasteMarkdown = async (clipboardData: string) => {
  let fragment = parse(clipboardData);
  if (hasFragmentData(fragment) === false) {
    return pasteIgnored;
  }
  fragment = await denormalizeSrcProps(fragment);
  await insertFragmentWithBreakpointWarning(fragment);
  return pasteHandled;
};

export const markdown: Plugin = {
  name: "markdown",
  mimeType: "text/plain",
  onPaste: handlePasteMarkdown,
};

export const __testing__ = {
  parse,
};
