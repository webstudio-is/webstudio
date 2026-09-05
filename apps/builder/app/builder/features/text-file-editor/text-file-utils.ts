import { EditorState, type Extension } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { keymap, tooltips } from "@codemirror/view";
import {
  autocompletion,
  CompletionContext,
  completionKeymap,
  type CompletionSource,
} from "@codemirror/autocomplete";
import {
  linter,
  lintGutter,
  lintKeymap,
  type Diagnostic,
} from "@codemirror/lint";
import { css } from "@codemirror/lang-css";
import {
  html as htmlLanguage,
  htmlCompletionSourceWith,
  type TagSpec,
} from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { parseJsonExpression } from "@webstudio-is/expression";
import { standardAttributesToReactProps } from "@webstudio-is/content-engine/jsx-attributes";
import {
  type MdxSourcePoint,
  type TextAssetSourceDiagnostic,
  validateTextAssetSource,
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

type TextFileSourceDiagnostic =
  | TextAssetSourceDiagnostic
  | ContentBlockDiagnostic;

export type ValidateTextFileSource = (input: {
  source: string;
  format: "md" | "mdx";
}) => Promise<readonly TextFileSourceDiagnostic[]>;

const validateTextFileSource: ValidateTextFileSource = async (input) =>
  (await validateTextAssetSource(input)).diagnostics;

export type MdxCompletionComponent = Readonly<{
  name: string;
  props: readonly Readonly<{
    name: string;
    values?: readonly string[];
  }>[];
}>;

const mdxCompletionExcludedSyntax = new Set([
  "CodeBlock",
  "FencedCode",
  "InlineCode",
  "ProcessingInstructionBlock",
  "CommentBlock",
  "Link",
  "Image",
]);

/** Uses CodeMirror's HTML parser to complete constrained JSX inside MDX. */
export const createMdxCompletionSource = (
  components: readonly MdxCompletionComponent[]
): CompletionSource => {
  const componentsByName = new Map(
    components.map((component) => [component.name, component] as const)
  );
  const extraTags = Object.fromEntries(
    components.map(({ name, props }) => [
      name,
      {
        attrs: Object.fromEntries(
          props.map((prop) => [prop.name, prop.values ?? null])
        ),
      } satisfies TagSpec,
    ])
  );
  const htmlSupport = htmlLanguage({
    matchClosingTags: false,
    autoCloseTags: false,
    extraTags,
  });
  const completeHtml = htmlCompletionSourceWith({ extraTags });
  return async (context) => {
    let node = syntaxTree(context.state).resolveInner(context.pos, -1);
    while (node.type.isTop === false) {
      if (mdxCompletionExcludedSyntax.has(node.name)) {
        return null;
      }
      const parent = node.parent;
      if (parent === null) {
        break;
      }
      node = parent;
    }
    const htmlState = EditorState.create({
      doc: context.state.doc,
      selection: { anchor: context.pos },
      extensions: [htmlSupport],
    });
    const htmlContext = new CompletionContext(
      htmlState,
      context.pos,
      context.explicit
    );
    const result = await completeHtml(htmlContext);
    if (result === null) {
      return null;
    }
    let htmlNode = syntaxTree(htmlState).resolveInner(context.pos, -1);
    if (htmlNode.name === "AttributeValue") {
      return result;
    }
    while (htmlNode.type.isTop === false && htmlNode.name !== "OpenTag") {
      const parent = htmlNode.parent;
      if (parent === null) {
        break;
      }
      htmlNode = parent;
    }
    if (htmlNode.name !== "OpenTag") {
      return result;
    }
    const tagNameNode = htmlNode.getChild("TagName");
    if (
      tagNameNode === null ||
      context.pos <= tagNameNode.to ||
      context.pos < tagNameNode.from
    ) {
      return result;
    }
    const tagName = htmlState.doc.sliceString(tagNameNode.from, tagNameNode.to);
    const componentPropNames = new Set(
      componentsByName.get(tagName)?.props.map(({ name }) => name) ?? []
    );
    const options = new Map(
      result.options.map((option) => {
        const label =
          option.label === "class"
            ? "className"
            : componentPropNames.has(option.label)
              ? option.label
              : (standardAttributesToReactProps[option.label] ?? option.label);
        return [
          label,
          {
            ...option,
            label,
            ...(option.apply === option.label ? { apply: label } : {}),
          },
        ] as const;
      })
    );
    return {
      ...result,
      options: Array.from(options.values()),
    };
  };
};

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
  validateSource = validateTextFileSource,
}: {
  source: string;
  format: "md" | "mdx";
  semanticDiagnostics?: readonly ContentBlockDiagnostic[];
  validateSource?: ValidateTextFileSource;
}): Promise<Diagnostic[]> => {
  const diagnostics = [
    ...(await validateSource({ source, format })),
    ...semanticDiagnostics,
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
      source: diagnostic.code,
      message:
        "message" in diagnostic
          ? diagnostic.message
          : diagnostic.code === "unsafe-mdx"
            ? diagnostic.reason
            : formatContentBlockDiagnostic(diagnostic),
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
  semanticDiagnostics: readonly ContentBlockDiagnostic[],
  validateSource: ValidateTextFileSource,
  completionComponents: readonly MdxCompletionComponent[]
): Extension[] => {
  const extensions: Extension[] = [
    linter(
      (view) =>
        getTextFileEditorDiagnostics({
          source: view.state.doc.toString(),
          format,
          semanticDiagnostics,
          validateSource,
        }),
      { delay: 300 }
    ),
    lintGutter(),
    keymap.of(lintKeymap),
  ];
  if (format === "mdx") {
    extensions.push(
      tooltips({ parent: document.body }),
      autocompletion({
        override: [createMdxCompletionSource(completionComponents)],
        icons: false,
      }),
      keymap.of(completionKeymap)
    );
  }
  return extensions;
};

const languageExtensions = {
  plain: [],
  css: [css()],
  html: [htmlLanguage()],
  javascript: [javascript()],
  json: [javascript()],
  markdown: [markdown()],
  xml: [htmlLanguage()],
} satisfies Record<AssetTextEditorLanguage, Extension[]>;

export const getTextFileEditorExtensions = (
  asset: Pick<Asset, "format">,
  semanticDiagnostics: readonly ContentBlockDiagnostic[] = [],
  validateSource: ValidateTextFileSource = validateTextFileSource,
  completionComponents: readonly MdxCompletionComponent[] = []
): Extension[] => {
  const language = getAssetTextEditorLanguage(asset);
  if (language === undefined) {
    return [];
  }
  const extensions = languageExtensions[language];
  const format = asset.format.toLowerCase();
  return format === "md" || format === "mdx"
    ? [
        ...extensions,
        ...getMarkdownExtensions(
          format,
          semanticDiagnostics,
          validateSource,
          completionComponents
        ),
      ]
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
