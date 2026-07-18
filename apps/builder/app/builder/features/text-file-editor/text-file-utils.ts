import type { Extension } from "@codemirror/state";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import {
  getMimeTypeByExtension,
  isTextFileAsset,
  type Asset,
} from "@webstudio-is/sdk";

export { isTextFileAsset };

const languageSupportByMimeType = new Map<string, () => Extension>([
  ["application/json", () => javascript()],
  ["application/xml", () => html()],
  ["image/svg+xml", () => html()],
  ["text/css", () => css()],
  ["text/html", () => html()],
  ["text/javascript", () => javascript()],
  ["text/markdown", () => markdown()],
]);

export const getTextFileEditorExtensions = (
  asset: Pick<Asset, "format">
): Extension[] => {
  const mimeType = getMimeTypeByExtension(asset.format);
  if (mimeType === undefined) {
    return [];
  }
  const createLanguageSupport = languageSupportByMimeType.get(mimeType);
  return createLanguageSupport === undefined ? [] : [createLanguageSupport()];
};
