import type { Extension } from "@codemirror/state";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import {
  getAssetTextEditorLanguage,
  type Asset,
  type AssetTextEditorLanguage,
} from "@webstudio-is/sdk";

const languageExtensions = {
  plain: [],
  css: [css()],
  html: [html()],
  javascript: [javascript()],
  json: [javascript()],
  markdown: [markdown()],
  xml: [html()],
} satisfies Record<AssetTextEditorLanguage, Extension[]>;

export const getTextFileEditorExtensions = (
  asset: Pick<Asset, "format">
): Extension[] => {
  const language = getAssetTextEditorLanguage(asset);
  if (language === undefined) {
    return [];
  }
  return languageExtensions[language];
};

export const isMarkdownSyntaxAsset = (asset: Pick<Asset, "format">) =>
  getAssetTextEditorLanguage(asset) === "markdown";

export const isMarkdownPreviewAsset = (asset: Pick<Asset, "format">) =>
  asset.format.toLowerCase() === "md";

export const getTextFileContentError = (
  asset: Pick<Asset, "format">,
  content: string
): string | undefined => {
  if (getAssetTextEditorLanguage(asset) !== "json") {
    return;
  }

  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return "Enter valid JSON.";
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "JSON content must have an object at its root.";
  }
};
