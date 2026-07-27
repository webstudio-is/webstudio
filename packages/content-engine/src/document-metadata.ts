import {
  createCanonicalAssetFileEntry,
  fullCanonicalAssetMetadataRequirements,
  type CanonicalAssetFileEntry,
  type CanonicalAssetMetadataRequirements,
} from "./canonical";
import { extractJsonProperties, JsonMetadataError } from "./json";
import { contentEngineLimits } from "./limits";
import {
  extractMarkdownBodyAndExcerpt,
  extractMarkdownFrontmatter,
  MarkdownMetadataError,
} from "./markdown";

const getEntryRequirements = (entry: CanonicalAssetFileEntry) =>
  entry.metadataRequirements ?? fullCanonicalAssetMetadataRequirements;

const isMarkdown = (entry: CanonicalAssetFileEntry) =>
  entry.document.extension.toLowerCase() === "md";

const isJson = (entry: CanonicalAssetFileEntry) =>
  entry.document.extension.toLowerCase() === "json";

export interface ContentMetadataCache {
  get(input: {
    base: CanonicalAssetFileEntry;
    requirements: CanonicalAssetMetadataRequirements;
  }): Promise<CanonicalAssetFileEntry | undefined>;
  set(input: {
    base: CanonicalAssetFileEntry;
    entry: CanonicalAssetFileEntry;
  }): Promise<void>;
}

const isCacheEntryForBase = (
  cached: CanonicalAssetFileEntry,
  base: CanonicalAssetFileEntry
) =>
  cached.projectId === base.projectId &&
  cached.assetId === base.assetId &&
  cached.revision === base.revision;

/**
 * Adds only the parsed metadata requested by a compilation plan to a canonical
 * base entry. Storage adapters provide bounded bytes and may persist the result
 * as a cache, but parsing semantics remain owned by the content engine.
 */
export const prepareCanonicalContentMetadata = async ({
  base,
  requirements,
  cache,
  readBytes,
}: {
  base: CanonicalAssetFileEntry;
  requirements: CanonicalAssetMetadataRequirements;
  cache?: ContentMetadataCache;
  readBytes: (maximumBytes: number) => Promise<Uint8Array>;
}) => {
  const cachedCandidate = await cache?.get({ base, requirements });
  const cached =
    cachedCandidate !== undefined && isCacheEntryForBase(cachedCandidate, base)
      ? cachedCandidate
      : undefined;
  const cachedRequirements =
    cached === undefined
      ? { structuredProperties: false, excerpt: false }
      : getEntryRequirements(cached);
  let properties: Record<string, unknown> = cached?.document.properties ?? {};
  let excerpt = cached?.document.excerpt;
  let metadataError = cached?.document.metadataError;
  const needsProperties =
    requirements.structuredProperties &&
    cachedRequirements.structuredProperties === false;
  const needsExcerpt =
    requirements.excerpt && cachedRequirements.excerpt === false;

  if (isMarkdown(base) && (needsProperties || needsExcerpt)) {
    const bytes = await readBytes(
      Math.min(base.document.size, contentEngineLimits.hydratedFileBytes)
    );
    if (needsProperties) {
      try {
        properties = (await extractMarkdownFrontmatter(bytes)).properties;
      } catch (error) {
        if (error instanceof MarkdownMetadataError === false) {
          throw error;
        }
        metadataError = { code: error.code, message: error.message };
      }
    }
    if (needsExcerpt) {
      try {
        excerpt = (await extractMarkdownBodyAndExcerpt(bytes)).excerpt;
      } catch (error) {
        if (error instanceof MarkdownMetadataError === false) {
          throw error;
        }
        metadataError ??= { code: error.code, message: error.message };
      }
    }
  } else if (isJson(base) && needsProperties) {
    if (base.document.size > contentEngineLimits.jsonBytes) {
      const error = new JsonMetadataError(
        "JSON_BYTES_EXCEEDED",
        "JSON metadata exceeds the byte limit"
      );
      metadataError = { code: error.code, message: error.message };
    } else {
      const bytes = await readBytes(base.document.size);
      try {
        properties = (await extractJsonProperties(bytes)).properties;
      } catch (error) {
        if (error instanceof JsonMetadataError === false) {
          throw error;
        }
        metadataError = { code: error.code, message: error.message };
      }
    }
  }

  const entry = createCanonicalAssetFileEntry({
    projectId: base.projectId,
    metadataRequirements: {
      structuredProperties:
        cachedRequirements.structuredProperties ||
        requirements.structuredProperties,
      excerpt: cachedRequirements.excerpt || requirements.excerpt,
    },
    document: {
      ...base.document,
      properties,
      ...(excerpt === undefined || excerpt.length === 0 ? {} : { excerpt }),
      ...(metadataError === undefined ? {} : { metadataError }),
    },
  });
  await cache?.set({ base, entry });
  return entry;
};
