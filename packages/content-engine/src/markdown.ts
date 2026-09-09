import { contentEngineLimits } from "./limits";
import { getUtf8ByteLength, type ByteSource } from "./byte-stream";
import { MarkdownMetadataError } from "./markdown-errors";
import { extractMarkdownBody } from "./markdown-body";
import {
  getSyntaxTreeChildren,
  parseMarkdownAst,
  type SyntaxTreeNode,
} from "./markdown-ast";

export {
  MarkdownMetadataError,
  type MarkdownMetadataErrorCode,
} from "./markdown-errors";
export { extractMarkdownBody, type MarkdownBody } from "./markdown-body";
export {
  createMarkdownFrontmatterDiagnostics,
  extractMarkdownFrontmatter,
  type MarkdownFrontmatterDiagnostic,
  type MarkdownFrontmatter,
} from "./frontmatter";

const textNodeTypes = new Set(["text", "inlineCode", "code"]);
const separatingNodeTypes = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "code",
]);

const markdownToPlainText = (body: string) => {
  const tree = parseMarkdownAst(body);
  const parts: string[] = [];
  const visit = (node: SyntaxTreeNode) => {
    if (textNodeTypes.has(node.type) && typeof node.value === "string") {
      parts.push(node.value);
    }
    if (node.type === "html" || node.type === "yaml") {
      return;
    }
    for (const child of getSyntaxTreeChildren(node)) {
      visit(child);
    }
    if (separatingNodeTypes.has(node.type)) {
      parts.push(" ");
    }
  };
  visit(tree);
  return parts.join("").replace(/\s+/g, " ").trim();
};

const truncateUtf8 = (value: string, maximumBytes: number) => {
  let bytes = 0;
  let result = "";
  for (const character of value) {
    const characterBytes = getUtf8ByteLength(character);
    if (bytes + characterBytes > maximumBytes) {
      break;
    }
    result += character;
    bytes += characterBytes;
  }
  return result.trimEnd();
};

/** Produces bounded plain text from a previously bounded Markdown body. */
export const extractMarkdownExcerpt = (
  body: string,
  maximumBytes = contentEngineLimits.excerptBytes
) => {
  if (
    Number.isInteger(maximumBytes) === false ||
    maximumBytes <= 0 ||
    maximumBytes > contentEngineLimits.excerptBytes
  ) {
    throw new MarkdownMetadataError(
      "MARKDOWN_EXCERPT_BYTES_EXCEEDED",
      "Markdown excerpt byte limit is outside the supported range"
    );
  }
  return truncateUtf8(markdownToPlainText(body), maximumBytes);
};

export const extractMarkdownBodyAndExcerpt = async (
  source: ByteSource,
  options: { bodyBytes?: number; excerptBytes?: number } = {}
) => {
  const result = await extractMarkdownBody(source, options.bodyBytes);
  return {
    ...result,
    excerpt: extractMarkdownExcerpt(result.body, options.excerptBytes),
  };
};
