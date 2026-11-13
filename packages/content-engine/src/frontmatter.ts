import { contentEngineLimits } from "./limits";
import {
  isAlias,
  isMap,
  isNode,
  isScalar,
  isSeq,
  LineCounter,
  parseDocument,
  stringify as stringifyYaml,
  type Node,
} from "yaml";
import {
  decodeUtf8 as decodeUtf8Bytes,
  toByteChunks,
  type ByteSource,
} from "./byte-stream";
import {
  getStructuredDataByteLength,
  normalizeStructuredDataObject,
  StructuredDataError,
} from "./structured-data";
import { MarkdownMetadataError } from "./markdown-errors";
import {
  findMarkdownFrontmatter,
  markdownByteOrderMark,
  markdownFrontmatterEnvelopeBytes,
} from "./markdown-scanner";

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
  serializedBytes: number;
};

const defaultFrontmatterLimits: FrontmatterLimits = {
  bytes: contentEngineLimits.frontmatterBytes,
  depth: contentEngineLimits.frontmatterDepth,
  fields: contentEngineLimits.frontmatterFields,
  stringBytes: contentEngineLimits.frontmatterStringBytes,
  serializedBytes: contentEngineLimits.indexedPropertiesBytes,
};

const decodeUtf8 = (bytes: Uint8Array) => {
  try {
    return decodeUtf8Bytes(bytes);
  } catch {
    throw new MarkdownMetadataError(
      "FRONTMATTER_DECODING_FAILED",
      "Markdown frontmatter is not valid UTF-8"
    );
  }
};

const toMarkdownMetadataError = (error: StructuredDataError) => {
  if (error.code === "DEPTH_EXCEEDED") {
    return new MarkdownMetadataError(
      "FRONTMATTER_DEPTH_EXCEEDED",
      "Markdown frontmatter exceeds the nesting limit"
    );
  }
  if (error.code === "FIELDS_EXCEEDED") {
    return new MarkdownMetadataError(
      "FRONTMATTER_FIELDS_EXCEEDED",
      "Markdown frontmatter exceeds the field limit"
    );
  }
  if (error.code === "STRING_BYTES_EXCEEDED") {
    return new MarkdownMetadataError(
      "FRONTMATTER_STRING_BYTES_EXCEEDED",
      "Markdown frontmatter contains a string that exceeds the byte limit"
    );
  }
  if (error.code === "SERIALIZED_BYTES_EXCEEDED") {
    return new MarkdownMetadataError(
      "FRONTMATTER_BYTES_EXCEEDED",
      "Markdown frontmatter properties exceed the indexed byte limit"
    );
  }
  return new MarkdownMetadataError(
    "FRONTMATTER_INVALID",
    "Markdown frontmatter must contain a JSON-compatible object"
  );
};

const parseYamlProperties = (
  source: string,
  limits: FrontmatterLimits
): Record<string, unknown> => {
  const lineCounter = new LineCounter();
  const document = parseDocument(source, {
    schema: "core",
    uniqueKeys: true,
    lineCounter,
  });
  if (document.errors.length > 0) {
    const error = document.errors[0];
    const location = lineCounter.linePos(error.pos[0]);
    throw new MarkdownMetadataError(
      "FRONTMATTER_INVALID",
      `Markdown frontmatter contains invalid YAML: ${error.message}`,
      // YAML starts after the opening frontmatter delimiter.
      { line: location.line + 1, column: location.col },
      error
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
      throw toMarkdownMetadataError(error);
    }
    throw error;
  }
};

export type MarkdownFrontmatterDiagnostic = Readonly<{
  code: MarkdownMetadataError["code"];
  severity: "warning";
  message: string;
  reason?: string;
  line?: number;
  column?: number;
}>;

const toFrontmatterDiagnostic = (
  error: MarkdownMetadataError,
  reason?: string
): MarkdownFrontmatterDiagnostic => ({
  code: error.code,
  severity: "warning",
  message: reason ?? error.message,
  ...(reason === undefined ? {} : { reason }),
  ...(error.line === undefined ? {} : { line: error.line }),
  ...(error.column === undefined ? {} : { column: error.column }),
});

const createStructuredFrontmatterDiagnostics = (
  root: Node,
  lineCounter: LineCounter,
  value: unknown
): MarkdownFrontmatterDiagnostic[] => {
  const diagnostics: MarkdownFrontmatterDiagnostic[] = [];
  let fields = 0;
  let fieldsExceeded = false;
  const addDiagnostic = (
    error: StructuredDataError,
    node?: Node,
    message?: string
  ) => {
    const location =
      node?.range === undefined || node.range === null
        ? undefined
        : lineCounter.linePos(node.range[0]);
    const metadataError = toMarkdownMetadataError(error);
    const diagnosticMessage = message ?? metadataError.message;
    diagnostics.push(
      toFrontmatterDiagnostic(
        location === undefined
          ? new MarkdownMetadataError(metadataError.code, diagnosticMessage)
          : new MarkdownMetadataError(
              metadataError.code,
              diagnosticMessage,
              // YAML starts after the opening frontmatter delimiter.
              { line: location.line + 1, column: location.col },
              error
            )
      )
    );
  };
  const countField = (node?: Node) => {
    fields += 1;
    if (fieldsExceeded === false && fields > defaultFrontmatterLimits.fields) {
      fieldsExceeded = true;
      addDiagnostic(new StructuredDataError("FIELDS_EXCEEDED"), node);
    }
  };
  const visit = (node: Node, depth: number) => {
    if (depth > defaultFrontmatterLimits.depth) {
      addDiagnostic(new StructuredDataError("DEPTH_EXCEEDED"), node);
      return;
    }
    if (isAlias(node)) {
      addDiagnostic(
        new StructuredDataError("INVALID"),
        node,
        "Markdown frontmatter contains an unsupported YAML alias"
      );
      return;
    }
    if (isScalar(node)) {
      const scalar = node.value;
      if (
        scalar === null ||
        typeof scalar === "boolean" ||
        (typeof scalar === "number" &&
          Number.isFinite(scalar) &&
          (Number.isInteger(scalar) === false || Number.isSafeInteger(scalar)))
      ) {
        return;
      }
      if (typeof scalar === "string") {
        if (
          new TextEncoder().encode(scalar).byteLength >
          defaultFrontmatterLimits.stringBytes
        ) {
          addDiagnostic(new StructuredDataError("STRING_BYTES_EXCEEDED"), node);
        }
        return;
      }
      addDiagnostic(
        new StructuredDataError("INVALID"),
        node,
        typeof scalar === "number"
          ? Number.isFinite(scalar)
            ? "Markdown frontmatter contains an integer outside the safe range"
            : "Markdown frontmatter contains a non-finite number"
          : "Markdown frontmatter contains a value that JSON cannot represent"
      );
      return;
    }
    if (isMap(node)) {
      for (const pair of node.items) {
        const child = isNode(pair.value) ? pair.value : undefined;
        countField(child ?? (isNode(pair.key) ? pair.key : undefined));
        if (child !== undefined) {
          visit(child, depth + 1);
        }
      }
      return;
    }
    if (isSeq(node)) {
      for (const value of node.items) {
        const child = isNode(value) ? value : undefined;
        countField(child);
        if (child !== undefined) {
          visit(child, depth + 1);
        }
      }
    }
  };

  if (isMap(root) === false) {
    addDiagnostic(new StructuredDataError("INVALID"), root);
  }
  visit(root, 1);
  try {
    if (
      getStructuredDataByteLength(value) >
      defaultFrontmatterLimits.serializedBytes
    ) {
      addDiagnostic(new StructuredDataError("SERIALIZED_BYTES_EXCEEDED"));
    }
  } catch {
    // A value that JSON cannot serialize already has a source-positioned
    // INVALID diagnostic from the scalar traversal above.
  }
  return diagnostics;
};

/** Validates authored Markdown frontmatter with the production YAML parser. */
export const createMarkdownFrontmatterDiagnostics = async (
  source: string
): Promise<MarkdownFrontmatterDiagnostic[]> => {
  const bytes = new TextEncoder().encode(source);
  const located = findMarkdownFrontmatter(bytes, true);
  if (located === null) {
    return [];
  }
  if (located === undefined) {
    return [
      toFrontmatterDiagnostic(
        new MarkdownMetadataError(
          "FRONTMATTER_BYTES_EXCEEDED",
          "Markdown frontmatter is not closed within the byte limit"
        )
      ),
    ];
  }
  if (located.yamlEnd - located.yamlStart > defaultFrontmatterLimits.bytes) {
    return [
      toFrontmatterDiagnostic(
        new MarkdownMetadataError(
          "FRONTMATTER_BYTES_EXCEEDED",
          "Markdown frontmatter exceeds the byte limit"
        )
      ),
    ];
  }
  const yaml = new TextDecoder("utf-8", { ignoreBOM: true }).decode(
    bytes.subarray(located.yamlStart, located.yamlEnd)
  );
  const lineCounter = new LineCounter();
  const document = parseDocument(yaml, {
    schema: "core",
    uniqueKeys: true,
    lineCounter,
  });
  if (document.errors.length > 0) {
    return document.errors.map((error) => {
      const location = lineCounter.linePos(error.pos[0]);
      return toFrontmatterDiagnostic(
        new MarkdownMetadataError(
          "FRONTMATTER_INVALID",
          `Markdown frontmatter contains invalid YAML: ${error.message}`,
          { line: location.line + 1, column: location.col },
          error
        ),
        error.message
      );
    });
  }
  const root = document.contents;
  if (root === null) {
    return [];
  }
  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    // Alias nodes are located and reported individually by the shared AST
    // validation below. The value is not needed for non-serializable input.
    value = undefined;
  }
  return createStructuredFrontmatterDiagnostics(root, lineCounter, value);
};

/**
 * Reads only the bounded opening frontmatter block from a Markdown byte stream.
 * Iteration stops as soon as the closing delimiter is found, so the body is
 * neither decoded nor retained by list-query metadata indexing. MDX can reuse
 * this path because its frontmatter plugins recognize blocks but do not parse
 * the YAML data contained by them.
 */
export const extractMarkdownFrontmatter = async (
  source: ByteSource,
  overrides: Partial<FrontmatterLimits> = {}
): Promise<MarkdownFrontmatter> => {
  const limits = { ...defaultFrontmatterLimits, ...overrides };
  const maximumReadBytes = limits.bytes + markdownFrontmatterEnvelopeBytes;
  const buffer = new Uint8Array(maximumReadBytes);
  let byteLength = 0;

  for await (const chunk of toByteChunks(source)) {
    let offset = 0;
    while (offset < chunk.byteLength) {
      const available = maximumReadBytes - byteLength;
      if (available <= 0) {
        break;
      }
      const initialRead = Math.max(0, 6 - byteLength);
      let length = Math.min(chunk.byteLength - offset, initialRead);
      if (initialRead === 0) {
        const remaining = chunk.subarray(
          offset,
          Math.min(chunk.byteLength, offset + available)
        );
        const newline = remaining.indexOf(0x0a);
        length = newline === -1 ? remaining.byteLength : newline + 1;
      }
      buffer.set(chunk.subarray(offset, offset + length), byteLength);
      byteLength += length;
      offset += length;

      const bytes = buffer.subarray(0, byteLength);
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
        const yaml = decodeUtf8(
          bytes.subarray(located.yamlStart, located.yamlEnd)
        );
        return {
          properties: parseYamlProperties(yaml, limits),
          frontmatterBytes,
          consumedBytes: located.blockEnd,
        };
      }
    }
    if (byteLength >= maximumReadBytes) {
      break;
    }
  }

  const bytes = buffer.subarray(0, byteLength);
  const located = findMarkdownFrontmatter(bytes, true);
  if (located === null) {
    return { properties: {}, frontmatterBytes: 0, consumedBytes: bytes.length };
  }
  if (located !== undefined) {
    const frontmatterBytes = located.yamlEnd - located.yamlStart;
    if (frontmatterBytes <= limits.bytes) {
      const yaml = decodeUtf8(
        bytes.subarray(located.yamlStart, located.yamlEnd)
      );
      return {
        properties: parseYamlProperties(yaml, limits),
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

export const serializeMarkdownFrontmatter = (
  properties: Readonly<Record<string, unknown>>
) => {
  const yaml = stringifyYaml(properties, {
    aliasDuplicateObjects: false,
    lineWidth: 0,
    sortMapEntries: true,
  }).trimEnd();
  return `---\n${yaml}\n---\n\n`;
};

/** Updates frontmatter without parsing or otherwise rewriting the body. */
export const replaceMarkdownFrontmatter = async ({
  source,
  properties,
}: {
  source: string;
  properties: Readonly<Record<string, unknown>>;
}) => {
  const replacement = serializeMarkdownFrontmatter(properties);
  await extractMarkdownFrontmatter(replacement);

  const encoder = new TextEncoder();
  const bytes = encoder.encode(source);
  const range = findMarkdownFrontmatter(bytes, true);
  const hasByteOrderMark = markdownByteOrderMark.every(
    (value, index) => bytes[index] === value
  );
  const prefix = hasByteOrderMark ? "\uFEFF" : "";
  if (range === null || range === undefined) {
    return prefix + replacement + source.slice(prefix.length);
  }

  const bodyStart = new TextDecoder("utf-8", { ignoreBOM: true }).decode(
    bytes.subarray(0, range.blockEnd)
  ).length;
  const suffix = source.slice(bodyStart);
  const separatorLength = suffix.startsWith("\r\n\r\n")
    ? 4
    : suffix.startsWith("\n\n")
      ? 2
      : suffix.startsWith("\r\n")
        ? 2
        : suffix.startsWith("\n")
          ? 1
          : 0;
  return prefix + replacement + suffix.slice(separatorLength);
};
