import { raw } from "hast-util-raw";
import {
  find as findHtmlProperty,
  html as htmlSchema,
} from "property-information";
import { VFile } from "vfile";
import { contentEngineLimits } from "./limits";
import {
  getSyntaxTreeChildren,
  isSyntaxTreeNode,
  type SyntaxTreeNode,
} from "./markdown-ast";
import {
  createMdxDocumentFromMarkdown,
  MdxDocumentError,
  type MdxDocument,
  type MdxMode,
} from "./mdx";
import { serializeMdxDocument } from "./mdx-serialization";

const markdownElementNodeType = "webstudioMarkdownElement";
const markdownHtmlModeData = "webstudioMarkdownHtmlMode";
const phrasingMarkdownNodeTypes = new Set([
  "delete",
  "emphasis",
  "heading",
  "link",
  "linkReference",
  "paragraph",
  "strong",
  "tableCell",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && Array.isArray(value) === false;

const getOffset = (node: SyntaxTreeNode) => {
  if (
    isRecord(node.position) === false ||
    isRecord(node.position.start) === false
  ) {
    return;
  }
  const { offset } = node.position.start;
  return typeof offset === "number" ? offset : undefined;
};

const setData = (node: SyntaxTreeNode, values: Record<string, unknown>) => {
  node.data = { ...(isRecord(node.data) ? node.data : {}), ...values };
};

const collectMarkdownHtmlModes = (root: SyntaxTreeNode) => {
  const modes = new Map<number, MdxMode>();
  const visit = (node: SyntaxTreeNode, parent?: SyntaxTreeNode) => {
    const offset = getOffset(node);
    if (node.type === "html" && offset !== undefined) {
      modes.set(
        offset,
        parent !== undefined && phrasingMarkdownNodeTypes.has(parent.type)
          ? "text"
          : "flow"
      );
      return;
    }
    for (const child of getSyntaxTreeChildren(node)) {
      visit(child, node);
    }
  };
  visit(root);
  return modes;
};

const prepareMarkdownElements = (
  node: SyntaxTreeNode,
  modes: ReadonlyMap<number, MdxMode>
) => {
  for (const child of getSyntaxTreeChildren(node)) {
    prepareMarkdownElements(child, modes);
  }
  if (node.type !== "element") {
    return;
  }
  node.type = markdownElementNodeType;
  const directModes = new Set(
    getSyntaxTreeChildren(node).flatMap((child) => {
      const offset = getOffset(child);
      const mode = offset === undefined ? undefined : modes.get(offset);
      return mode === undefined ? [] : [mode];
    })
  );
  if (directModes.size === 1) {
    setData(node, { [markdownHtmlModeData]: [...directModes][0] });
  }
};

const restoreMarkdownElements = (
  node: SyntaxTreeNode,
  inheritedMode: MdxMode = "flow"
) => {
  let childMode = inheritedMode;
  if (node.type === markdownElementNodeType) {
    node.type = "element";
    if (
      isRecord(node.data) &&
      (node.data[markdownHtmlModeData] === "flow" ||
        node.data[markdownHtmlModeData] === "text")
    ) {
      childMode = node.data[markdownHtmlModeData];
      delete node.data[markdownHtmlModeData];
    }
  } else if (node.type === "element" || node.type === "comment") {
    setData(node, { mdxMode: inheritedMode });
    if (node.type === "element" && isRecord(node.properties)) {
      node.properties = Object.fromEntries(
        Object.entries(node.properties).map(([name, value]) => [
          findHtmlProperty(htmlSchema, name).attribute,
          value,
        ])
      );
    }
  }
  for (const child of getSyntaxTreeChildren(node)) {
    restoreMarkdownElements(child, childMode);
  }
};

export type MarkdownToMdxConversionPreview = Readonly<{
  source: string;
  document: MdxDocument;
}>;

/** Converts Markdown without writing or allocating a destination Asset. */
export const previewMarkdownToMdxConversion = async ({
  source,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
}: {
  source: string;
  maximumBytes?: number;
}): Promise<MarkdownToMdxConversionPreview> => {
  const document = await createMdxDocumentFromMarkdown({
    source,
    maximumBytes,
    transformHast: ({ sourceRoot, hastRoot }) => {
      prepareMarkdownElements(hastRoot, collectMarkdownHtmlModes(sourceRoot));
      const parsed = raw(
        hastRoot as Parameters<typeof raw>[0],
        new VFile(source),
        { passThrough: [markdownElementNodeType] }
      );
      if (isSyntaxTreeNode(parsed) === false || parsed.type !== "root") {
        throw new MdxDocumentError({
          code: "invalid-mdx",
          message: "Markdown did not produce an HTML document",
        });
      }
      restoreMarkdownElements(parsed);
      return parsed;
    },
  });
  return {
    source: serializeMdxDocument(document),
    document,
  };
};
