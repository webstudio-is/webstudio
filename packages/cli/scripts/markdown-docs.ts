import { fromMarkdown } from "mdast-util-from-markdown";
import { toString } from "mdast-util-to-string";
import { directive } from "micromark-extension-directive";
import {
  directiveFromMarkdown,
  type LeafDirective,
} from "mdast-util-directive";
import type { ListItem, RootContent } from "mdast";

const docSectionDirectiveName = "doc-section";

const parseMarkdown = (markdown: string) =>
  fromMarkdown(markdown, {
    extensions: [directive()],
    mdastExtensions: [directiveFromMarkdown()],
  });

const getStartOffset = (node: RootContent) => node.position?.start.offset ?? 0;

const getNodeText = (node: RootContent | ListItem) => toString(node);

const getSectionEndIndex = (
  children: readonly RootContent[],
  startIndex: number,
  maxHeadingDepth: number | undefined
) => {
  for (let index = startIndex; index < children.length; index += 1) {
    const node = children[index];
    if (node?.type !== "heading") {
      continue;
    }
    if (maxHeadingDepth === undefined || (node.depth ?? 0) <= maxHeadingDepth) {
      return index;
    }
  }
  return children.length;
};

const getMarkedSectionNodes = (
  children: readonly RootContent[],
  directiveIndex: number
) => {
  const firstNode = children[directiveIndex + 1];
  if (firstNode === undefined) {
    return [];
  }
  const startsWithHeading = firstNode.type === "heading";
  const contentStartIndex = startsWithHeading
    ? directiveIndex + 2
    : directiveIndex + 1;
  const endIndex = getSectionEndIndex(
    children,
    contentStartIndex,
    startsWithHeading ? (firstNode.depth ?? 0) : undefined
  );
  return children.slice(contentStartIndex, endIndex);
};

const isDocSectionDirective = (node: RootContent): node is LeafDirective =>
  node.type === "leafDirective" && node.name === docSectionDirectiveName;

const getDirectiveRemovalEnd = (markdown: string, node: LeafDirective) => {
  let end = node.position?.end.offset ?? 0;
  while (markdown[end] === "\n") {
    end += 1;
  }
  return end;
};

export const stripDocMeta = (markdown: string) => {
  const tree = parseMarkdown(markdown);
  const ranges = tree.children
    .filter(isDocSectionDirective)
    .map((node) => ({
      start: getStartOffset(node),
      end: getDirectiveRemovalEnd(markdown, node),
    }))
    .sort((left, right) => right.start - left.start);
  let strippedMarkdown = markdown;
  for (const range of ranges) {
    strippedMarkdown =
      strippedMarkdown.slice(0, range.start) +
      strippedMarkdown.slice(range.end);
  }
  return strippedMarkdown;
};

const getListItemText = (node: ListItem) =>
  getNodeText(node).replace(/\s+/g, " ").trim();

const getListItems = (nodes: readonly RootContent[]) =>
  nodes.flatMap((node) =>
    node.type === "list" ? node.children.map(getListItemText) : []
  );

export const getTitle = (markdown: string) => {
  const heading = parseMarkdown(markdown).children.find(
    (node) => node.type === "heading" && node.depth === 1
  );
  return heading === undefined ? "" : getNodeText(heading).trim();
};

export const buildDocSections = (docs: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(docs).map(([docName, markdown]) => {
      const tree = parseMarkdown(markdown);
      const docSections: Record<string, string[]> = {};
      tree.children.forEach((node, index) => {
        if (isDocSectionDirective(node) === false) {
          return;
        }
        const fieldName = node.attributes?.field;
        if (typeof fieldName !== "string" || fieldName.length === 0) {
          throw new Error(`Missing doc-section field ${docName}`);
        }
        const items = getListItems(getMarkedSectionNodes(tree.children, index));
        if (items.length === 0) {
          throw new Error(
            `Missing generated doc section ${docName}:${fieldName}`
          );
        }
        docSections[fieldName] = [...(docSections[fieldName] ?? []), ...items];
      });
      if (
        docName.startsWith("manual-") &&
        Object.keys(docSections).length === 0
      ) {
        throw new Error(`Missing generated doc sections ${docName}`);
      }
      return [docName, docSections];
    })
  );

export const buildDocTitles = (docs: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(docs).map(([docName, markdown]) => {
      const title = getTitle(markdown);
      if (title === "" && docName.startsWith("manual-")) {
        throw new Error(`Missing generated doc title ${docName}`);
      }
      return [docName, title === "" ? docName : title];
    })
  );
