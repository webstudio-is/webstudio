import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseDocument } from "yaml";
import { appendBytes, toByteChunks, type ByteSource } from "./byte-stream";
import {
  normalizeStructuredDataObject,
  StructuredDataError,
} from "./structured-data";
import { MarkdownMetadataError } from "./markdown-errors";
import {
  findMarkdownFrontmatter,
  markdownByteOrderMark,
} from "./markdown-scanner";
import { extractMarkdownBody } from "./markdown-body";

export {
  MarkdownMetadataError,
  type MarkdownMetadataErrorCode,
} from "./markdown-errors";
export { extractMarkdownBody, type MarkdownBody } from "./markdown-body";

export type MarkdownFrontmatter = {
  properties: Record<string, unknown>;
  frontmatterBytes: number;
  consumedBytes: number;
};

type FrontmatterLimits = {
  bytes: number;
  depth: number;
  fields: number;
  stringBytes: number;
};

const defaultFrontmatterLimits: FrontmatterLimits = {
  bytes: assetResourceLimits.frontmatterBytes,
  depth: assetResourceLimits.frontmatterDepth,
  fields: assetResourceLimits.frontmatterFields,
  stringBytes: assetResourceLimits.frontmatterStringBytes,
};

const encoder = new TextEncoder();
const decodeUtf8 = (bytes: Uint8Array) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new MarkdownMetadataError(
      "FRONTMATTER_DECODING_FAILED",
      "Markdown frontmatter is not valid UTF-8"
    );
  }
};

const parseYamlProperties = (
  source: string,
  limits: FrontmatterLimits
): Record<string, unknown> => {
  const document = parseDocument(source, {
    schema: "core",
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new MarkdownMetadataError(
      "FRONTMATTER_INVALID",
      "Markdown frontmatter contains invalid YAML"
    );
  }

  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    throw new MarkdownMetadataError(
      "FRONTMATTER_INVALID",
      "Markdown frontmatter contains unsupported YAML aliases"
    );
  }
  if (value === null) {
    return {};
  }
  try {
    return normalizeStructuredDataObject(value, limits);
  } catch (error) {
    if (error instanceof StructuredDataError) {
      if (error.code === "DEPTH_EXCEEDED") {
        throw new MarkdownMetadataError(
          "FRONTMATTER_DEPTH_EXCEEDED",
          "Markdown frontmatter exceeds the nesting limit"
        );
      }
      if (error.code === "FIELDS_EXCEEDED") {
        throw new MarkdownMetadataError(
          "FRONTMATTER_FIELDS_EXCEEDED",
          "Markdown frontmatter exceeds the field limit"
        );
      }
      if (error.code === "STRING_BYTES_EXCEEDED") {
        throw new MarkdownMetadataError(
          "FRONTMATTER_STRING_BYTES_EXCEEDED",
          "Markdown frontmatter contains a string that exceeds the byte limit"
        );
      }
      throw new MarkdownMetadataError(
        "FRONTMATTER_INVALID",
        "Markdown frontmatter must contain a JSON-compatible object"
      );
    }
    throw error;
  }
};

/**
 * Reads only the bounded opening frontmatter block from a Markdown byte stream.
 * Iteration stops as soon as the closing delimiter is found, so the body is
 * neither decoded nor retained by list-query metadata indexing.
 */
export const extractMarkdownFrontmatter = async (
  source: ByteSource,
  overrides: Partial<FrontmatterLimits> = {}
): Promise<MarkdownFrontmatter> => {
  const limits = { ...defaultFrontmatterLimits, ...overrides };
  const maximumReadBytes = limits.bytes + markdownByteOrderMark.byteLength + 10;
  let bytes = new Uint8Array();

  for await (const chunk of toByteChunks(source)) {
    let offset = 0;
    while (offset < chunk.byteLength) {
      const available = maximumReadBytes - bytes.byteLength;
      if (available <= 0) {
        break;
      }
      // First read only enough to identify the opening delimiter. A regular
      // Markdown file can therefore return without retaining a large body
      // delivered in the same storage chunk.
      const initialRead = Math.max(0, 6 - bytes.byteLength);
      let length = Math.min(chunk.byteLength - offset, initialRead);
      if (initialRead === 0) {
        const remaining = chunk.subarray(
          offset,
          Math.min(chunk.byteLength, offset + available)
        );
        const newline = remaining.indexOf(0x0a);
        // Advance one line at a time so a closing delimiter and a large body
        // in the same storage chunk do not cause the body to be retained.
        length = newline === -1 ? remaining.byteLength : newline + 1;
      }
      bytes = appendBytes(bytes, chunk.subarray(offset, offset + length));
      offset += length;

      const located = findMarkdownFrontmatter(bytes, false);
      if (located === null) {
        return {
          properties: {},
          frontmatterBytes: 0,
          consumedBytes: bytes.length,
        };
      }
      if (located !== undefined) {
        const frontmatterBytes = located.yamlEnd - located.yamlStart;
        if (frontmatterBytes > limits.bytes) {
          throw new MarkdownMetadataError(
            "FRONTMATTER_BYTES_EXCEEDED",
            "Markdown frontmatter exceeds the byte limit"
          );
        }
        const source = decodeUtf8(
          bytes.subarray(located.yamlStart, located.yamlEnd)
        );
        return {
          properties: parseYamlProperties(source, limits),
          frontmatterBytes,
          consumedBytes: located.blockEnd,
        };
      }
    }
    if (bytes.byteLength >= maximumReadBytes) {
      break;
    }
  }

  const located = findMarkdownFrontmatter(bytes, true);
  if (located === null) {
    return { properties: {}, frontmatterBytes: 0, consumedBytes: bytes.length };
  }
  if (located !== undefined) {
    const frontmatterBytes = located.yamlEnd - located.yamlStart;
    if (frontmatterBytes <= limits.bytes) {
      const source = decodeUtf8(
        bytes.subarray(located.yamlStart, located.yamlEnd)
      );
      return {
        properties: parseYamlProperties(source, limits),
        frontmatterBytes,
        consumedBytes: located.blockEnd,
      };
    }
  }
  throw new MarkdownMetadataError(
    "FRONTMATTER_BYTES_EXCEEDED",
    "Markdown frontmatter is not closed within the byte limit"
  );
};

type MarkdownNode = {
  type: string;
  value?: unknown;
  children?: MarkdownNode[];
};

const textNodeTypes = new Set(["text", "inlineCode", "code"]);
const separatingNodeTypes = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "code",
]);

const markdownToPlainText = (body: string) => {
  const tree = unified().use(remarkParse).parse(body) as MarkdownNode;
  const parts: string[] = [];
  const visit = (node: MarkdownNode) => {
    if (textNodeTypes.has(node.type) && typeof node.value === "string") {
      parts.push(node.value);
    }
    if (node.type === "html" || node.type === "yaml") {
      return;
    }
    for (const child of node.children ?? []) {
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
    const characterBytes = encoder.encode(character).byteLength;
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
  maximumBytes = assetResourceLimits.excerptBytes
) => {
  if (
    Number.isInteger(maximumBytes) === false ||
    maximumBytes <= 0 ||
    maximumBytes > assetResourceLimits.excerptBytes
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
