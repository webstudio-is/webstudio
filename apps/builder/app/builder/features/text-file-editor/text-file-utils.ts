import type { Extension } from "@codemirror/state";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { micromark } from "micromark";
import { gfm, gfmHtml } from "micromark-extension-gfm";
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

export const isMarkdownAsset = (asset: Pick<Asset, "format">) =>
  getAssetTextEditorLanguage(asset) === "markdown";

export const renderMarkdown = (source: string) =>
  micromark(source, {
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
