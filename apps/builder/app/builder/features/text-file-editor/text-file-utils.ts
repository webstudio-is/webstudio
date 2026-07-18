import type { Asset } from "@webstudio-is/sdk";

export type TextFileEditorLanguage =
  | "css"
  | "html"
  | "javascript"
  | "json"
  | "markdown";

const textFileLanguages = new Map<string, TextFileEditorLanguage | undefined>([
  ["css", "css"],
  ["csv", undefined],
  ["html", "html"],
  ["js", "javascript"],
  ["json", "json"],
  ["md", "markdown"],
  ["txt", undefined],
  ["xml", "html"],
]);

export const getTextFileEditorLanguage = (
  asset: Pick<Asset, "format">
): TextFileEditorLanguage | undefined =>
  textFileLanguages.get(asset.format.toLowerCase());

export const isTextFileAsset = (asset: Pick<Asset, "format">) =>
  textFileLanguages.has(asset.format.toLowerCase());
