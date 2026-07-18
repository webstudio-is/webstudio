import type { Extension } from "@codemirror/state";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { getMimeTypeByExtension, type Asset } from "@webstudio-is/sdk";

const languageSupportByMimeType = new Map<string, () => Extension>([
  ["application/json", () => javascript()],
  ["application/xml", () => html()],
  ["image/svg+xml", () => html()],
  ["text/css", () => css()],
  ["text/html", () => html()],
  ["text/javascript", () => javascript()],
  ["text/markdown", () => markdown()],
]);

const getAssetMimeType = (asset: Pick<Asset, "format">) =>
  getMimeTypeByExtension(asset.format);

export const getTextFileEditorExtensions = (
  asset: Pick<Asset, "format">
): Extension[] => {
  const mimeType = getAssetMimeType(asset);
  if (mimeType === undefined) {
    return [];
  }
  const createLanguageSupport = languageSupportByMimeType.get(mimeType);
  return createLanguageSupport === undefined ? [] : [createLanguageSupport()];
};

export const isTextFileAsset = (asset: Pick<Asset, "format">) => {
  const mimeType = getAssetMimeType(asset);
  return (
    mimeType?.startsWith("text/") === true ||
    mimeType === "application/json" ||
    mimeType === "application/xml" ||
    mimeType === "image/svg+xml"
  );
};
