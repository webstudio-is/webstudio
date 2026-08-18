import type { Extension } from "@codemirror/state";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { parseJsonExpression } from "@webstudio-is/expression";
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

export const normalizeTextFileContent = (
  asset: Pick<Asset, "format">,
  content: string
): { content: string } | { error: string } => {
  if (getAssetTextEditorLanguage(asset) !== "json") {
    return { content };
  }

  const value = parseJsonExpression(content);
  if (value === undefined) {
    return { error: "Enter a JSON-compatible value." };
  }

  return { content: `${JSON.stringify(value, undefined, 2)}\n` };
};

export const normalizeTextFileConversion = (
  asset: Pick<Asset, "format">,
  content: string
) => {
  if (getAssetTextEditorLanguage(asset) === "json" && content.trim() === "") {
    return { content: "{}\n" };
  }
  return normalizeTextFileContent(asset, content);
};
