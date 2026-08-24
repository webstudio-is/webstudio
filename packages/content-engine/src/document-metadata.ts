import {
  createCanonicalAssetFileEntry,
  getCanonicalAssetMetadataRequirements,
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
import { markdownFrontmatterEnvelopeBytes } from "./markdown-scanner";

const isMarkdown = (entry: CanonicalAssetFileEntry) =>
  entry.document.extension.toLowerCase() === "md";

const hasMarkdownFrontmatter = (entry: CanonicalAssetFileEntry) =>
  isMarkdown(entry) || entry.document.extension.toLowerCase() === "mdx";

const isJson = (entry: CanonicalAssetFileEntry) =>
  entry.document.extension.toLowerCase() === "json";

const trimIncompleteUtf8Suffix = (bytes: Uint8Array) => {
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return bytes;
  } catch {
    try {
      // Streaming decoding accepts only an incomplete trailing code point;
      // malformed bytes elsewhere still fail and must remain an error.
      new TextDecoder("utf-8", { fatal: true }).decode(bytes, {
        stream: true,
      });
    } catch {
      return bytes;
    }
  }
  for (let suffixBytes = 1; suffixBytes <= 3; suffixBytes += 1) {
    const prefix = bytes.subarray(0, -suffixBytes);
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(prefix);
      return prefix;
    } catch {
      // A UTF-8 code point occupies at most four bytes.
    }
  }
  return bytes;
};

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
      : getCanonicalAssetMetadataRequirements(cached);
  let properties: Record<string, unknown> =
    cachedRequirements.structuredProperties && cached !== undefined
      ? cached.document.properties
      : {};
  let excerpt =
    isMarkdown(base) && cachedRequirements.excerpt
      ? cached?.document.excerpt
      : undefined;
  let metadataError =
    cachedRequirements.structuredProperties || cachedRequirements.excerpt
      ? cached?.document.metadataError
      : undefined;
  const needsProperties =
    requirements.structuredProperties &&
    cachedRequirements.structuredProperties === false;
  const needsExcerpt =
    requirements.excerpt && cachedRequirements.excerpt === false;

  if (
    (hasMarkdownFrontmatter(base) && needsProperties) ||
    (isMarkdown(base) && needsExcerpt)
  ) {
    // Frontmatter discovery needs only the bounded opening block. Markdown
    // excerpt generation still receives the larger body budget.
    const maximumBytes =
      isMarkdown(base) && needsExcerpt
        ? contentEngineLimits.hydratedFileBytes
        : contentEngineLimits.frontmatterBytes +
          markdownFrontmatterEnvelopeBytes;
    let bytes = await readBytes(Math.min(base.document.size, maximumBytes));
    if (
      isMarkdown(base) &&
      needsExcerpt &&
      base.document.size > bytes.byteLength
    ) {
      bytes = trimIncompleteUtf8Suffix(bytes);
    }
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
    if (isMarkdown(base) && needsExcerpt) {
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
