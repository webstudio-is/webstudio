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
  createMarkdownFrontmatterDiagnostics,
  type MdxSourcePoint,
  validateMdxDocumentSource,
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

export const getTextFileEditorDiagnostics = async ({
  source,
  format,
  semanticDiagnostics = [],
}: {
  source: string;
  format: "md" | "mdx";
  semanticDiagnostics?: readonly ContentBlockDiagnostic[];
}): Promise<Diagnostic[]> => {
  const sourceDiagnostics =
    format === "mdx"
      ? (await validateMdxDocumentSource({ source })).diagnostics.map(
          (diagnostic) => ({
            ...("sourceRange" in diagnostic &&
            diagnostic.sourceRange !== undefined
              ? { sourceRange: diagnostic.sourceRange }
              : {}),
            ...("line" in diagnostic
              ? { line: diagnostic.line, column: diagnostic.column }
              : {}),
            severity: diagnostic.severity,
            message: diagnostic.message,
          })
        )
      : (await createMarkdownFrontmatterDiagnostics(source)).map(
          (diagnostic) => ({
            line: diagnostic.line,
            column: diagnostic.column,
            severity: diagnostic.severity,
            message: diagnostic.message,
          })
        );
  const diagnostics = [
    ...sourceDiagnostics,
    ...semanticDiagnostics.map((diagnostic) => ({
      sourceRange: diagnostic.sourceRange,
      severity: diagnostic.severity,
      message:
        diagnostic.code === "invalid-mdx"
          ? diagnostic.message
          : diagnostic.code === "unsafe-mdx"
            ? diagnostic.reason
            : formatContentBlockDiagnostic(diagnostic),
    })),
  ].map((diagnostic) => {
    const from =
      "sourceRange" in diagnostic && diagnostic.sourceRange !== undefined
        ? getPointOffset(source, diagnostic.sourceRange.start)
        : "line" in diagnostic &&
            diagnostic.line !== undefined &&
            diagnostic.column !== undefined
          ? getPointOffset(source, {
              line: diagnostic.line,
              column: diagnostic.column,
            })
          : 0;
    const to =
      "sourceRange" in diagnostic && diagnostic.sourceRange !== undefined
        ? Math.max(from, getPointOffset(source, diagnostic.sourceRange.end))
        : Math.min(source.length, from + 1);
    return {
      from,
      to,
      severity: diagnostic.severity,
      message: diagnostic.message,
    };
  });
  return Array.from(
    new Map(
      diagnostics.map((diagnostic) => [JSON.stringify(diagnostic), diagnostic])
    ).values()
  );
};

const getMarkdownExtensions = (
  format: "md" | "mdx",
  semanticDiagnostics: readonly ContentBlockDiagnostic[]
): Extension[] => [
  linter(
    (view) =>
      getTextFileEditorDiagnostics({
        source: view.state.doc.toString(),
        format,
        semanticDiagnostics,
      }),
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
  const format = asset.format.toLowerCase();
  return format === "md" || format === "mdx"
    ? [...extensions, ...getMarkdownExtensions(format, semanticDiagnostics)]
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
