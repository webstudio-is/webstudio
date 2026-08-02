import type {
  AssetResourceContentOptions,
  ContentDatabaseDocument,
  HydratedAssetContent,
} from "./schema";
import { contentEngineLimits } from "./limits";
import { extractMarkdownBody } from "./markdown-body";
import {
  ByteLimitExceededError,
  decodeUtf8,
  getUtf8ByteLength,
  readBoundedBytes,
} from "./byte-stream";
import { mapBounded } from "./async-utils";
import {
  rewriteMarkdownAssetReferenceRanges,
  type MarkdownAssetReferences,
} from "./markdown-references";

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

const isTextDocument = (document: ContentDatabaseDocument) =>
  typeof document.mimeType === "string" &&
  (document.mimeType.startsWith("text/") ||
    [
      "application/json",
      "application/javascript",
      "application/xml",
      "image/svg+xml",
    ].includes(document.mimeType));

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
  try {
    return await readBoundedBytes(response.data, maximumBytes);
  } catch (error) {
    if (error instanceof ByteLimitExceededError) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_LIMIT_EXCEEDED",
        message: "Asset storage returned more content than requested",
      });
    }
    throw error;
  }
};

const decodeText = (bytes: Uint8Array) => {
  try {
    return decodeUtf8(bytes);
  } catch {
    throw new AssetResourceHydrationError({
      code: "CONTENT_DECODING_FAILED",
      message: "Selected asset content is not valid UTF-8",
    });
  }
};

const getAssetResourceHydrationReadLength = (
  document: ContentDatabaseDocument & { size: number },
  options: Exclude<AssetResourceContentOptions, { mode: "none" }>
) => {
  if (options.mode === "range") {
    return Math.max(
      0,
      Math.min(options.length, document.size - options.offset)
    );
  }
  const maximumBytes =
    options.maxBytes ?? contentEngineLimits.hydratedFileBytes;
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
  assetReferences,
  assetUrls,
}: {
  result: unknown;
  documents: readonly ContentDatabaseDocument[];
  options: AssetResourceContentOptions;
  read: AssetResourceContentReader;
  assetReferences?: MarkdownAssetReferences;
  assetUrls?: Readonly<Record<string, string>>;
}) => {
  if (options.mode === "none") {
    return { content: {}, hydratedFileCount: 0, hydratedBytes: 0 };
  }
  const identities = getSelectedIdentities(result);
  if (identities.length > contentEngineLimits.hydratedFileCount) {
    throw new AssetResourceHydrationError({
      code: "CONTENT_LIMIT_EXCEEDED",
      message: "Too many selected assets requested content hydration",
      details: {
        fileCount: identities.length,
        fileCountLimit: contentEngineLimits.hydratedFileCount,
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
      document.contentRef !== identity.contentRef ||
      typeof document.size !== "number" ||
      typeof document.mimeType !== "string"
    ) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_IDENTITY_REQUIRED",
        message: "Selected asset content identity is stale or unavailable",
        details: { assetId: identity._id },
      });
    }
    const hydratableDocument = {
      ...document,
      size: document.size,
      mimeType: document.mimeType,
    };
    if (isTextDocument(hydratableDocument) === false) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_NOT_TEXT",
        message: "Selected binary asset cannot be embedded as text",
        details: {
          assetId: identity._id,
          mimeType: hydratableDocument.mimeType,
        },
      });
    }
    return {
      identity,
      document: hydratableDocument,
      readLength: getAssetResourceHydrationReadLength(
        hydratableDocument,
        options
      ),
    };
  });
  const totalReadBytes = selected.reduce(
    (total, item) => total + item.readLength,
    0
  );
  if (totalReadBytes > contentEngineLimits.hydratedTotalBytes) {
    throw new AssetResourceHydrationError({
      code: "CONTENT_LIMIT_EXCEEDED",
      message: "Selected assets exceed the total hydrated-content limit",
      details: {
        totalReadBytes,
        totalByteLimit: contentEngineLimits.hydratedTotalBytes,
      },
    });
  }

  const hydrated = await mapBounded(
    selected,
    contentEngineLimits.concurrentContentReads,
    async (item) => {
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
      if (options.mode === "markdown-body-ref") {
        try {
          text = (await extractMarkdownBody(bytes, item.readLength || 1)).body;
          const references = assetReferences?.[item.identity.contentRef];
          if (references !== undefined && assetUrls !== undefined) {
            text = rewriteMarkdownAssetReferenceRanges({
              markdown: text,
              references,
              assetUrls,
            });
          }
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
      const returnedBytes = getUtf8ByteLength(text);
      return {
        id: item.identity._id,
        returnedBytes,
        content: {
          ...item.identity,
          encoding: "utf-8" as const,
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
        },
      };
    }
  );
  return {
    content: Object.fromEntries(
      hydrated.map(({ id, content }) => [id, content])
    ) as Record<string, HydratedAssetContent>,
    hydratedFileCount: selected.length,
    hydratedBytes: hydrated.reduce(
      (total, { returnedBytes }) => total + returnedBytes,
      0
    ),
  };
};
