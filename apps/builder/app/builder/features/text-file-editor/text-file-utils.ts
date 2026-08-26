import type { Extension } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import {
  linter,
  lintGutter,
  lintKeymap,
  type Diagnostic,
} from "@codemirror/lint";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { parseJsonExpression } from "@webstudio-is/expression";
import {
  createMdxSourceDiagnostics,
  parseMdxDocumentRecovering,
  type MdxSourcePoint,
} from "@webstudio-is/content-engine/mdx";
import {
  getAssetTextEditorLanguage,
  type Asset,
  type AssetTextEditorLanguage,
  type ContentBlockDiagnostic,
} from "@webstudio-is/sdk";
import type { AssetContentSessionState } from "@webstudio-is/content-engine/asset-content-session";
import { formatContentBlockDiagnostic } from "~/shared/content-block-diagnostics";

export type MdxPersistenceFeedback = Readonly<{
  kind: "failed" | "conflicting";
  message: string;
}>;

export const getMdxPersistenceFeedback = (
  state: Pick<AssetContentSessionState, "status" | "error">
): MdxPersistenceFeedback | undefined => {
  if (state.status === "failed") {
    return {
      kind: "failed",
      message: state.error?.message ?? "Unable to save this file.",
    };
  }
  if (state.status === "conflicting") {
    return {
      kind: "conflicting",
      message:
        state.error?.message ??
        "This file changed elsewhere. Reload before continuing.",
    };
  }
};

const getPointOffset = (source: string, point: MdxSourcePoint) => {
  if (point.offset !== undefined) {
    return Math.min(point.offset, source.length);
  }
  const lines = source.split("\n");
  let offset = 0;
  for (let index = 0; index < point.line - 1 && index < lines.length; index++) {
    offset += lines[index].length + 1;
  }
  return Math.min(offset + point.column - 1, source.length);
};

export const getMdxEditorDiagnostics = async (
  source: string,
  semanticDiagnostics: readonly ContentBlockDiagnostic[] = []
): Promise<Diagnostic[]> => {
  const result = await parseMdxDocumentRecovering({ source });
  const diagnostics = [
    ...createMdxSourceDiagnostics(result.diagnostics).map((diagnostic) => ({
      sourceRange: diagnostic.sourceRange,
      severity: diagnostic.severity,
      message: diagnostic.message,
    })),
    ...semanticDiagnostics.flatMap((diagnostic) =>
      diagnostic.code === "invalid-mdx" || diagnostic.code === "unsafe-mdx"
        ? []
        : [
            {
              sourceRange: diagnostic.sourceRange,
              severity: diagnostic.severity,
              message: formatContentBlockDiagnostic(diagnostic),
            },
          ]
    ),
  ];
  return diagnostics.map((diagnostic) => {
    const from =
      diagnostic.sourceRange === undefined
        ? 0
        : getPointOffset(source, diagnostic.sourceRange.start);
    const to =
      diagnostic.sourceRange === undefined
        ? Math.min(1, source.length)
        : Math.max(from, getPointOffset(source, diagnostic.sourceRange.end));
    return {
      from,
      to,
      severity: diagnostic.severity,
      message: diagnostic.message,
    };
  });
};

const getMdxExtensions = (
  semanticDiagnostics: readonly ContentBlockDiagnostic[]
): Extension[] => [
  linter(
    (view) =>
      getMdxEditorDiagnostics(view.state.doc.toString(), semanticDiagnostics),
    { delay: 300 }
  ),
  lintGutter(),
  keymap.of(lintKeymap),
];

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
  asset: Pick<Asset, "format">,
  semanticDiagnostics: readonly ContentBlockDiagnostic[] = []
): Extension[] => {
  const language = getAssetTextEditorLanguage(asset);
  if (language === undefined) {
    return [];
  }
  const extensions = languageExtensions[language];
  return asset.format.toLowerCase() === "mdx"
    ? [...extensions, ...getMdxExtensions(semanticDiagnostics)]
    : extensions;
};

export const isMarkdownAsset = (asset: Pick<Asset, "format">) =>
  getAssetTextEditorLanguage(asset) === "markdown";

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
