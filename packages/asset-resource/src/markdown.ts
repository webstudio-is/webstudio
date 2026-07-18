import { assetResourceLimits } from "@webstudio-is/sdk";
import remarkFrontmatter from "remark-frontmatter";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { parseDocument } from "yaml";

export type MarkdownMetadataErrorCode =
  | "FRONTMATTER_BYTES_EXCEEDED"
  | "FRONTMATTER_DECODING_FAILED"
  | "FRONTMATTER_INVALID"
  | "FRONTMATTER_DEPTH_EXCEEDED"
  | "FRONTMATTER_FIELDS_EXCEEDED"
  | "FRONTMATTER_STRING_BYTES_EXCEEDED"
  | "MARKDOWN_BODY_BYTES_EXCEEDED"
  | "MARKDOWN_BODY_DECODING_FAILED"
  | "MARKDOWN_EXCERPT_BYTES_EXCEEDED";

export class MarkdownMetadataError extends Error {
  code: MarkdownMetadataErrorCode;

  constructor(code: MarkdownMetadataErrorCode, message: string) {
    super(message);
    this.name = "MarkdownMetadataError";
    this.code = code;
  }
}

export type MarkdownFrontmatter = {
  properties: Record<string, unknown>;
  frontmatterBytes: number;
  consumedBytes: number;
};

export type MarkdownBody = {
  body: string;
  bodyBytes: number;
  sourceBytes: number;
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
const byteOrderMark = new Uint8Array([0xef, 0xbb, 0xbf]);

const startsWith = (bytes: Uint8Array, expected: Uint8Array, offset = 0) => {
  if (bytes.byteLength - offset < expected.byteLength) {
    return false;
  }
  return expected.every((value, index) => bytes[offset + index] === value);
};

const appendBytes = (previous: Uint8Array, next: Uint8Array) => {
  const result = new Uint8Array(previous.byteLength + next.byteLength);
  result.set(previous);
  result.set(next, previous.byteLength);
  return result;
};

type LocatedFrontmatter = {
  yamlStart: number;
  yamlEnd: number;
  blockEnd: number;
};

const findFrontmatter = (
  bytes: Uint8Array,
  endOfFile: boolean
): LocatedFrontmatter | null | undefined => {
  let openingStart = 0;
  if (startsWith(bytes, byteOrderMark)) {
    openingStart = byteOrderMark.byteLength;
  } else if (
    bytes.byteLength < byteOrderMark.byteLength &&
    byteOrderMark
      .slice(0, bytes.byteLength)
      .every((value, index) => value === bytes[index])
  ) {
    return endOfFile ? null : undefined;
  }

  if (bytes.byteLength < openingStart + 4) {
    return endOfFile ? null : undefined;
  }
  if (
    bytes[openingStart] !== 0x2d ||
    bytes[openingStart + 1] !== 0x2d ||
    bytes[openingStart + 2] !== 0x2d
  ) {
    return null;
  }

  let yamlStart = openingStart + 3;
  if (bytes[yamlStart] === 0x0a) {
    yamlStart += 1;
  } else if (bytes[yamlStart] === 0x0d) {
    if (bytes.byteLength === yamlStart + 1) {
      return endOfFile ? null : undefined;
    }
    if (bytes[yamlStart + 1] !== 0x0a) {
      return null;
    }
    yamlStart += 2;
  } else {
    return null;
  }

  let lineStart = yamlStart;
  for (let index = yamlStart; index <= bytes.byteLength; index += 1) {
    const atEnd = index === bytes.byteLength;
    if (atEnd === false && bytes[index] !== 0x0a) {
      continue;
    }
    if (atEnd && endOfFile === false) {
      return;
    }

    let lineEnd = index;
    if (lineEnd > lineStart && bytes[lineEnd - 1] === 0x0d) {
      lineEnd -= 1;
    }
    const lineLength = lineEnd - lineStart;
    const isDelimiter =
      lineLength === 3 &&
      ((bytes[lineStart] === 0x2d &&
        bytes[lineStart + 1] === 0x2d &&
        bytes[lineStart + 2] === 0x2d) ||
        (bytes[lineStart] === 0x2e &&
          bytes[lineStart + 1] === 0x2e &&
          bytes[lineStart + 2] === 0x2e));
    if (isDelimiter) {
      return {
        yamlStart,
        yamlEnd: lineStart,
        blockEnd: atEnd ? index : index + 1,
      };
    }
    lineStart = index + 1;
  }
};

const toChunks = (
  source: string | Uint8Array | AsyncIterable<Uint8Array>
): AsyncIterable<Uint8Array> => {
  if (typeof source === "string") {
    return {
      async *[Symbol.asyncIterator]() {
        yield encoder.encode(source);
      },
    };
  }
  if (source instanceof Uint8Array) {
    return {
      async *[Symbol.asyncIterator]() {
        yield source;
      },
    };
  }
  return source;
};

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

const readBoundedBytes = async (
  source: string | Uint8Array | AsyncIterable<Uint8Array>,
  maximumBytes: number
) => {
  let bytes = new Uint8Array();
  for await (const chunk of toChunks(source)) {
    const remaining = maximumBytes + 1 - bytes.byteLength;
    if (remaining <= 0) {
      break;
    }
    bytes = appendBytes(bytes, chunk.subarray(0, remaining));
    if (bytes.byteLength > maximumBytes) {
      throw new MarkdownMetadataError(
        "MARKDOWN_BODY_BYTES_EXCEEDED",
        "Markdown content exceeds the byte limit"
      );
    }
  }
  return bytes;
};

const parseYamlProperties = (
  source: string,
  limits: FrontmatterLimits
): Record<string, unknown> => {
  const tree = unified()
    .use(remarkParse)
    .use(remarkFrontmatter, ["yaml"])
    .parse(`---\n${source}---\n`);
  const yamlNode = tree.children.find((node) => node.type === "yaml");
  if (yamlNode === undefined || !("value" in yamlNode)) {
    throw new MarkdownMetadataError(
      "FRONTMATTER_INVALID",
      "Markdown frontmatter could not be parsed"
    );
  }

  const document = parseDocument(String(yamlNode.value), {
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
  if (
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    throw new MarkdownMetadataError(
      "FRONTMATTER_INVALID",
      "Markdown frontmatter must contain an object"
    );
  }

  let fields = 0;
  const normalize = (input: unknown, depth: number): unknown => {
    if (depth > limits.depth) {
      throw new MarkdownMetadataError(
        "FRONTMATTER_DEPTH_EXCEEDED",
        "Markdown frontmatter exceeds the nesting limit"
      );
    }
    if (typeof input === "string") {
      if (encoder.encode(input).byteLength > limits.stringBytes) {
        throw new MarkdownMetadataError(
          "FRONTMATTER_STRING_BYTES_EXCEEDED",
          "Markdown frontmatter contains a string that exceeds the byte limit"
        );
      }
      return input;
    }
    if (
      input === null ||
      typeof input === "boolean" ||
      (typeof input === "number" && Number.isFinite(input))
    ) {
      return input;
    }
    if (Array.isArray(input)) {
      return input.map((item) => normalize(item, depth + 1));
    }
    if (typeof input === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(input)) {
        fields += 1;
        if (fields > limits.fields) {
          throw new MarkdownMetadataError(
            "FRONTMATTER_FIELDS_EXCEEDED",
            "Markdown frontmatter exceeds the field limit"
          );
        }
        if (
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype"
        ) {
          throw new MarkdownMetadataError(
            "FRONTMATTER_INVALID",
            "Markdown frontmatter contains an unsafe property name"
          );
        }
        result[key] = normalize(child, depth + 1);
      }
      return result;
    }
    throw new MarkdownMetadataError(
      "FRONTMATTER_INVALID",
      "Markdown frontmatter contains a non-JSON value"
    );
  };

  return normalize(value, 1) as Record<string, unknown>;
};

/**
 * Reads only the bounded opening frontmatter block from a Markdown byte stream.
 * Iteration stops as soon as the closing delimiter is found, so the body is
 * neither decoded nor retained by list-query metadata indexing.
 */
export const extractMarkdownFrontmatter = async (
  source: string | Uint8Array | AsyncIterable<Uint8Array>,
  overrides: Partial<FrontmatterLimits> = {}
): Promise<MarkdownFrontmatter> => {
  const limits = { ...defaultFrontmatterLimits, ...overrides };
  const maximumReadBytes = limits.bytes + byteOrderMark.byteLength + 10;
  let bytes = new Uint8Array();

  for await (const chunk of toChunks(source)) {
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

      const located = findFrontmatter(bytes, false);
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

  const located = findFrontmatter(bytes, true);
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

/** Reads and decodes one complete bounded Markdown file, excluding frontmatter. */
export const extractMarkdownBody = async (
  source: string | Uint8Array | AsyncIterable<Uint8Array>,
  maximumBytes = assetResourceLimits.hydratedFileBytes
): Promise<MarkdownBody> => {
  if (
    Number.isInteger(maximumBytes) === false ||
    maximumBytes <= 0 ||
    maximumBytes > assetResourceLimits.hydratedFileBytes
  ) {
    throw new MarkdownMetadataError(
      "MARKDOWN_BODY_BYTES_EXCEEDED",
      "Markdown body byte limit is outside the supported range"
    );
  }
  const bytes = await readBoundedBytes(source, maximumBytes);
  let sourceText: string;
  try {
    sourceText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new MarkdownMetadataError(
      "MARKDOWN_BODY_DECODING_FAILED",
      "Markdown content is not valid UTF-8"
    );
  }

  const located = findFrontmatter(bytes, true);
  const bodyStart = located?.blockEnd ?? 0;
  const body =
    bodyStart === 0 ? sourceText : decodeUtf8(bytes.subarray(bodyStart));
  return {
    body,
    bodyBytes: encoder.encode(body).byteLength,
    sourceBytes: bytes.byteLength,
  };
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
  source: string | Uint8Array | AsyncIterable<Uint8Array>,
  options: { bodyBytes?: number; excerptBytes?: number } = {}
) => {
  const result = await extractMarkdownBody(source, options.bodyBytes);
  return {
    ...result,
    excerpt: extractMarkdownExcerpt(result.body, options.excerptBytes),
  };
};
