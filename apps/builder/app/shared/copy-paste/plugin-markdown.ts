import { gfm, gfmHtml } from "micromark-extension-gfm";
import { micromark } from "micromark";
import { insertWebstudioFragmentAt } from "../instance-utils";
import { denormalizeSrcProps } from "./asset-upload";
import { generateFragmentFromHtml } from "../html";
import type { Plugin } from "./init-copy-paste";

const parse = (clipboardData: string) => {
  const html = micromark(clipboardData, "utf-8", {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
  const fragment = generateFragmentFromHtml(html);
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

export const markdown: Plugin = {
  name: "markdown",
  mimeType: "text/plain",
  onPaste: async (clipboardData: string) => {
    let fragment = parse(clipboardData);
    if (fragment === undefined) {
      return false;
    }
    fragment = await denormalizeSrcProps(fragment);
    return insertWebstudioFragmentAt(fragment);
  },
};

export const __testing__ = {
  parse,
};
