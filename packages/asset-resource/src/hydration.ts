import {
  assetResourceLimits,
  hydratedAssetContent,
  type AssetFileDocument,
  type AssetResourceContentOptions,
  type HydratedAssetContent,
} from "@webstudio-is/sdk";
import { extractMarkdownBody } from "./markdown";

export class AssetResourceHydrationError extends Error {
  readonly code:
    | "CONTENT_IDENTITY_REQUIRED"
    | "CONTENT_NOT_TEXT"
    | "CONTENT_DECODING_FAILED"
    | "CONTENT_LIMIT_EXCEEDED";
  readonly details?: Record<string, string | number>;

  constructor({
    code,
    message,
    details,
  }: {
    code: AssetResourceHydrationError["code"];
    message: string;
    details?: AssetResourceHydrationError["details"];
  }) {
    super(message);
    this.name = "AssetResourceHydrationError";
    this.code = code;
    this.details = details;
  }
}

export type AssetResourceContentReader = (
  contentRef: string,
  range?: { offset: number; length: number }
) => Promise<{
  data: AsyncIterable<Uint8Array>;
  contentLength?: number;
}>;

type SelectedIdentity = {
  _id: string;
  revision: string;
  contentRef: string;
};

const getSelectedIdentities = (result: unknown): SelectedIdentity[] => {
  if (result === null) {
    return [];
  }
  const values = Array.isArray(result) ? result : [result];
  const identities = new Map<string, SelectedIdentity>();
  for (const value of values) {
    if (
      typeof value !== "object" ||
      value === null ||
      "_id" in value === false ||
      typeof value._id !== "string" ||
      "revision" in value === false ||
      typeof value.revision !== "string" ||
      "contentRef" in value === false ||
      typeof value.contentRef !== "string"
    ) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_IDENTITY_REQUIRED",
        message:
          "Hydrated query results must retain _id, revision, and contentRef",
      });
    }
    const previous = identities.get(value._id);
    if (
      previous !== undefined &&
      (previous.revision !== value.revision ||
        previous.contentRef !== value.contentRef)
    ) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_IDENTITY_REQUIRED",
        message: "A selected asset ID has conflicting content identity",
        details: { assetId: value._id },
      });
    }
    identities.set(value._id, {
      _id: value._id,
      revision: value.revision,
      contentRef: value.contentRef,
    });
  }
  return Array.from(identities.values());
};

const isTextDocument = (document: AssetFileDocument) =>
  document.mimeType.startsWith("text/") ||
  ["application/json", "application/javascript", "application/xml"].includes(
    document.mimeType
  );

const readBytes = async ({
  read,
  contentRef,
  range,
  maximumBytes,
}: {
  read: AssetResourceContentReader;
  contentRef: string;
  range?: { offset: number; length: number };
  maximumBytes: number;
}) => {
  if (maximumBytes === 0) {
    return new Uint8Array();
  }
  const response = await read(contentRef, range);
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of response.data) {
    if (length + chunk.byteLength > maximumBytes) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_LIMIT_EXCEEDED",
        message: "Asset storage returned more content than requested",
      });
    }
    chunks.push(chunk);
    length += chunk.byteLength;
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const decodeText = (bytes: Uint8Array) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new AssetResourceHydrationError({
      code: "CONTENT_DECODING_FAILED",
      message: "Selected asset content is not valid UTF-8",
    });
  }
};

const getReadLength = (
  document: AssetFileDocument,
  options: Exclude<AssetResourceContentOptions, { mode: "none" }>
) => {
  if (options.mode === "range") {
    return Math.max(
      0,
      Math.min(options.length, document.size - options.offset)
    );
  }
  const maximumBytes =
    options.maxBytes ?? assetResourceLimits.hydratedFileBytes;
  if (document.size > maximumBytes) {
    throw new AssetResourceHydrationError({
      code: "CONTENT_LIMIT_EXCEEDED",
      message: "Selected asset exceeds the per-file content limit",
      details: {
        assetId: document._id,
        assetBytes: document.size,
        fileByteLimit: maximumBytes,
      },
    });
  }
  return document.size;
};

export const hydrateAssetResourceResult = async ({
  result,
  documents,
  options,
  read,
}: {
  result: unknown;
  documents: readonly AssetFileDocument[];
  options: AssetResourceContentOptions;
  read: AssetResourceContentReader;
}) => {
  if (options.mode === "none") {
    return { content: {}, hydratedFileCount: 0, hydratedBytes: 0 };
  }
  const identities = getSelectedIdentities(result);
  if (identities.length > assetResourceLimits.hydratedFileCount) {
    throw new AssetResourceHydrationError({
      code: "CONTENT_LIMIT_EXCEEDED",
      message: "Too many selected assets requested content hydration",
      details: {
        fileCount: identities.length,
        fileCountLimit: assetResourceLimits.hydratedFileCount,
      },
    });
  }
  const documentsById = new Map(
    documents.map((document) => [document._id, document])
  );
  const selected = identities.map((identity) => {
    const document = documentsById.get(identity._id);
    if (
      document === undefined ||
      document.revision !== identity.revision ||
      document.contentRef !== identity.contentRef
    ) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_IDENTITY_REQUIRED",
        message: "Selected asset content identity is stale or unavailable",
        details: { assetId: identity._id },
      });
    }
    if (isTextDocument(document) === false) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_NOT_TEXT",
        message: "Selected binary asset cannot be embedded as text",
        details: { assetId: identity._id, mimeType: document.mimeType },
      });
    }
    return { identity, document, readLength: getReadLength(document, options) };
  });
  const totalReadBytes = selected.reduce(
    (total, item) => total + item.readLength,
    0
  );
  if (totalReadBytes > assetResourceLimits.hydratedTotalBytes) {
    throw new AssetResourceHydrationError({
      code: "CONTENT_LIMIT_EXCEEDED",
      message: "Selected assets exceed the total hydrated-content limit",
      details: {
        totalReadBytes,
        totalByteLimit: assetResourceLimits.hydratedTotalBytes,
      },
    });
  }

  const content: Record<string, HydratedAssetContent> = {};
  let cursor = 0;
  let hydratedBytes = 0;
  const worker = async () => {
    while (cursor < selected.length) {
      const item = selected[cursor];
      cursor += 1;
      const range =
        options.mode === "range"
          ? { offset: options.offset, length: item.readLength }
          : item.readLength === 0
            ? undefined
            : { offset: 0, length: item.readLength };
      const bytes = await readBytes({
        read,
        contentRef: item.identity.contentRef,
        range,
        maximumBytes: item.readLength,
      });
      if (bytes.byteLength !== item.readLength) {
        throw new AssetResourceHydrationError({
          code: "CONTENT_IDENTITY_REQUIRED",
          message: "Selected asset bytes do not match canonical metadata",
          details: { assetId: item.identity._id },
        });
      }
      let text: string;
      if (options.mode === "markdown-body") {
        try {
          text = (await extractMarkdownBody(bytes, item.readLength || 1)).body;
        } catch {
          throw new AssetResourceHydrationError({
            code: "CONTENT_DECODING_FAILED",
            message: "Selected Markdown body could not be decoded",
            details: { assetId: item.identity._id },
          });
        }
      } else {
        text = decodeText(bytes);
      }
      const returnedBytes = new TextEncoder().encode(text).byteLength;
      hydratedBytes += returnedBytes;
      content[item.identity._id] = hydratedAssetContent.parse({
        ...item.identity,
        encoding: "utf-8",
        text,
        ...(options.mode === "range"
          ? {
              range: {
                offset: options.offset,
                length: bytes.byteLength,
                total: item.document.size,
              },
            }
          : {}),
      });
    }
  };
  const settlements = await Promise.allSettled(
    Array.from(
      {
        length: Math.min(
          selected.length,
          assetResourceLimits.concurrentContentReads
        ),
      },
      worker
    )
  );
  const failure = settlements.find(
    (settlement): settlement is PromiseRejectedResult =>
      settlement.status === "rejected"
  );
  if (failure !== undefined) {
    throw failure.reason;
  }
  return {
    content,
    hydratedFileCount: selected.length,
    hydratedBytes,
  };
};
