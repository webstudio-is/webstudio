import type {
  AssetFileDocument,
  AssetResourceContentOptions,
  HydratedAssetContent,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
import {
  AssetResourceHydrationError,
  getAssetResourceHydrationReadLength,
  hydrateAssetResourceResult,
  type AssetResourceContentReader,
} from "./hydration";

type HydrationOptions = Exclude<AssetResourceContentOptions, { mode: "none" }>;

export type AssetContentHydrator = (
  document: AssetFileDocument,
  options: HydrationOptions
) => Promise<HydratedAssetContent>;

export class AssetContentReadError extends Error {
  constructor(options?: ErrorOptions) {
    super("Selected asset content could not be read", options);
    this.name = "AssetContentReadError";
  }
}

export const createAssetContentHydrator = (
  read: AssetResourceContentReader | undefined
): AssetContentHydrator => {
  const reads = new Map<string, Promise<HydratedAssetContent>>();
  const queue: Array<() => void> = [];
  let readCount = 0;
  let reservedBytes = 0;
  let activeReads = 0;

  const withReadSlot = async <Result>(operation: () => Promise<Result>) => {
    if (activeReads >= assetResourceLimits.concurrentContentReads) {
      await new Promise<void>((resolve) => queue.push(resolve));
    }
    activeReads += 1;
    try {
      return await operation();
    } finally {
      activeReads -= 1;
      queue.shift()?.();
    }
  };

  return (document, options) => {
    if (read === undefined) {
      throw new Error("Asset content reader is unavailable");
    }
    const optionKey =
      options.mode === "range"
        ? `${options.mode}:${options.offset}:${options.length}`
        : `${options.mode}:${options.maxBytes ?? ""}`;
    const cacheKey = `${document._id}\u0000${document.revision}\u0000${optionKey}`;
    const cached = reads.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const readLength = getAssetResourceHydrationReadLength(document, options);
    if (
      readCount >= assetResourceLimits.hydratedFileCount ||
      reservedBytes + readLength > assetResourceLimits.hydratedTotalBytes
    ) {
      throw new AssetResourceHydrationError({
        code: "CONTENT_LIMIT_EXCEEDED",
        message: "Asset content selection exceeds hydration limits",
        details: {
          fileCount: readCount + 1,
          fileCountLimit: assetResourceLimits.hydratedFileCount,
          totalReadBytes: reservedBytes + readLength,
          totalByteLimit: assetResourceLimits.hydratedTotalBytes,
        },
      });
    }
    readCount += 1;
    reservedBytes += readLength;

    const pending = withReadSlot(async () => {
      try {
        const hydrated = await hydrateAssetResourceResult({
          result: {
            _id: document._id,
            revision: document.revision,
            contentRef: document.contentRef,
          },
          documents: [document],
          options,
          read,
        });
        const content = hydrated.content[document._id];
        if (content === undefined) {
          throw new AssetContentReadError();
        }
        return content;
      } catch (error) {
        if (
          error instanceof AssetResourceHydrationError ||
          error instanceof AssetContentReadError
        ) {
          throw error;
        }
        throw new AssetContentReadError({ cause: error });
      }
    });
    reads.set(cacheKey, pending);
    return pending;
  };
};
