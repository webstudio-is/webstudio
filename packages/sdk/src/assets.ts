import warnOnce from "warn-once";
import type { Asset } from "./schema/assets";

/**
 * Central registry of allowed file types, extensions, and MIME types
 * for asset uploads and serving.
 *
 * IMPORTANT: For images, we only support formats that Cloudflare Image Resizing can process.
 * Supported by Cloudflare: JPEG, PNG, GIF, WebP, SVG, AVIF
 * See: https://developers.cloudflare.com/images/image-resizing/format-limitations/
 *
 * Other formats (BMP, ICO, TIFF) are allowed for upload but served as-is without optimization.
 */

export const ALLOWED_FILE_TYPES = {
  // Documents
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Code
  txt: "text/plain",
  md: "text/markdown",
  js: "text/javascript",
  css: "text/css",
  json: "application/json",
  html: "text/html",
  xml: "application/xml",

  // Archives
  zip: "application/zip",
  rar: "application/vnd.rar",

  // Audio
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  m4a: "audio/mp4",

  // Video
  mp4: "video/mp4",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  webm: "video/webm",

  // Images
  // Note: Cloudflare Image Resizing supports: jpg, jpeg, png, gif, webp, svg, avif
  // Other formats (bmp, ico, tif, tiff) are served as-is without optimization
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  avif: "image/avif",
  ico: "image/vnd.microsoft.icon", // Used for favicons
  bmp: "image/bmp", // Served without optimization
  tif: "image/tiff", // Served without optimization
  tiff: "image/tiff", // Served without optimization

  // Fonts
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
} as const;

export type AllowedFileExtension = keyof typeof ALLOWED_FILE_TYPES;

/**
 * Set of allowed file extensions for quick lookup
 */
export const ALLOWED_FILE_EXTENSIONS: ReadonlySet<AllowedFileExtension> =
  new Set<AllowedFileExtension>(
    Object.keys(ALLOWED_FILE_TYPES) as AllowedFileExtension[]
  );

/**
 * Set of allowed MIME type categories
 */
export const MIME_CATEGORIES = [
  "image",
  "video",
  "audio",
  "font",
  "text",
  "application",
] as const;

export type MimeCategory = (typeof MIME_CATEGORIES)[number];

/**
 * File extensions grouped by MIME category for UI display and filtering
 */
export const FILE_EXTENSIONS_BY_CATEGORY: Readonly<
  Record<MimeCategory, AllowedFileExtension[]>
> = (() => {
  const categories = Object.fromEntries(
    MIME_CATEGORIES.map((category) => [category, []])
  ) as unknown as Record<MimeCategory, AllowedFileExtension[]>;

  Object.entries(ALLOWED_FILE_TYPES).forEach(([ext, mimeType]) => {
    const [category] = mimeType.split("/") as [MimeCategory];

    if (category in categories) {
      categories[category].push(ext as AllowedFileExtension);
    }
  });

  return categories;
})();

// Create extension-to-MIME map for utilities
const extensionToMime = new Map(
  Object.entries(ALLOWED_FILE_TYPES).map(([ext, mime]) => [`.${ext}`, mime])
);

const mimeTypes = new Set<string>(extensionToMime.values());

const mimePatterns = new Set<string>([
  ...mimeTypes.values(),
  ...MIME_CATEGORIES.map((category): `${MimeCategory}/*` => `${category}/*`),
]);

const getCategory = (pattern: string): MimeCategory => {
  const categoryAsString = pattern.split("/")[0];
  const category = MIME_CATEGORIES.find(
    (category) => category === categoryAsString
  );
  if (category === undefined) {
    throw new Error(`Invalid mime pattern: ${pattern}`);
  }
  return category;
};

/**
 * All image file extensions
 */
export const IMAGE_EXTENSIONS: readonly AllowedFileExtension[] =
  FILE_EXTENSIONS_BY_CATEGORY.image;

/**
 * All image MIME types
 */
export const IMAGE_MIME_TYPES: readonly string[] = IMAGE_EXTENSIONS.map(
  (ext) => ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES]
);

/**
 * All video file extensions
 */
export const VIDEO_EXTENSIONS: readonly AllowedFileExtension[] =
  FILE_EXTENSIONS_BY_CATEGORY.video;

/**
 * All video MIME types
 */
export const VIDEO_MIME_TYPES: readonly string[] = VIDEO_EXTENSIONS.map(
  (ext) => ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES]
);

/**
 * All font file extensions
 */
export const FONT_EXTENSIONS: readonly AllowedFileExtension[] =
  FILE_EXTENSIONS_BY_CATEGORY.font;

/**
 * Get MIME type for a given file extension
 */
export const getMimeTypeByExtension = (
  extension: string
): string | undefined => {
  return ALLOWED_FILE_TYPES[extension.toLowerCase() as AllowedFileExtension];
};

/**
 * Get MIME type from a filename
 */
export const getMimeTypeByFilename = (fileName: string): string => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension) {
    return "application/octet-stream";
  }
  return getMimeTypeByExtension(extension) ?? "application/octet-stream";
};

/**
 * Check if a file extension is allowed
 */
export const isAllowedExtension = (extension: string): boolean => {
  return ALLOWED_FILE_EXTENSIONS.has(
    extension.toLowerCase() as AllowedFileExtension
  );
};

/**
 * Check if a MIME type category is allowed
 */
export const isAllowedMimeCategory = (category: string): boolean => {
  return MIME_CATEGORIES.includes(category as MimeCategory);
};

/**
 * Convert accept attribute value to MIME patterns.
 * `".svg,font/otf,text/*"` -> `"image/svg+xml", "font/otf", "text/*"`
 */
export const acceptToMimePatterns = (accept: string): Set<string> | "*" => {
  const result = new Set<string>();

  if (accept === "") {
    return "*";
  }

  for (const type of accept.split(",")) {
    const trimmed = type.trim();
    if (trimmed === "*" || trimmed === "*/*") {
      return "*";
    }
    if (mimePatterns.has(trimmed)) {
      result.add(trimmed);
      continue;
    }
    const mime = extensionToMime.get(trimmed);

    if (mime === undefined) {
      warnOnce(
        true,
        `Couldn't not parse accept attribute value: ${trimmed}. Falling back to "*".`
      );
      return "*";
    }

    result.add(mime);
  }

  return result;
};

/**
 * Convert accept attribute value to MIME categories.
 * `".svg,font/otf,text/*"` -> `"image", "font", "text"`
 */
export const acceptToMimeCategories = (
  accept: string
): Set<MimeCategory> | "*" => {
  const patterns = acceptToMimePatterns(accept);
  if (patterns === "*") {
    return "*";
  }
  const categories = new Set<MimeCategory>();
  for (const pattern of patterns) {
    categories.add(getCategory(pattern));
  }
  return categories;
};

/**
 * Get MIME type for an asset based on its type and format
 */
export const getAssetMime = ({
  type,
  format,
}: {
  type: "image" | "font" | "file";
  format: string;
}): string | undefined => {
  const lowerFormat = format.toLowerCase();
  const mime = `${type}/${lowerFormat}`;
  if (mimeTypes.has(mime)) {
    return mime;
  }
  const mime2 = extensionToMime.get(`.${lowerFormat}`);
  if (mime2 === undefined) {
    warnOnce(
      true,
      `Couldn't determine mime type of asset: ${type}, ${format}.`
    );
  }
  return mime2;
};

/**
 * Check if an asset matches the given MIME patterns.
 * Supports legacy assets that were incorrectly stored with type "file".
 */
export const doesAssetMatchMimePatterns = (
  asset: Pick<Asset, "format" | "type" | "name">,
  patterns: Set<string> | "*"
): boolean => {
  if (patterns === "*") {
    return true;
  }

  // Try matching based on asset type and format
  const mime = getAssetMime(asset);
  if (mime !== undefined) {
    if (patterns.has(mime) || patterns.has(`${getCategory(mime)}/*`)) {
      return true;
    }
  }

  // If it doesn't match and the asset type is "file" and has a name,
  // try detecting the actual MIME type from the filename extension
  // This handles legacy assets that were incorrectly stored as type "file"
  if (asset.type === "file" && asset.name) {
    const extension = asset.name.split(".").pop()?.toLowerCase();
    if (extension) {
      const mimeFromExtension = extensionToMime.get(`.${extension}`);
      if (mimeFromExtension) {
        return (
          patterns.has(mimeFromExtension) ||
          patterns.has(`${getCategory(mimeFromExtension)}/*`)
        );
      }
    }
  }

  return false;
};

/**
 * Validate a filename and return its extension and MIME type
 * @throws Error if file extension is not allowed
 */
export const validateFileName = (
  fileName: string
): { extension: string; mimeType: string } => {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension) {
    throw new Error("File must have an extension");
  }

  if (!isAllowedExtension(extension)) {
    throw new Error(
      `File type "${extension}" is not allowed. Allowed types: ${Array.from(
        ALLOWED_FILE_EXTENSIONS
      ).join(", ")}`
    );
  }

  const mimeType = getMimeTypeByExtension(extension);
  if (!mimeType) {
    throw new Error(
      `Could not determine MIME type for extension: ${extension}`
    );
  }

  return { extension, mimeType };
};

/**
 * Detect the asset type from a file based on its extension
 */
export const detectAssetType = (
  fileName: string
): "image" | "font" | "video" | "file" => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (!ext) {
    return "file";
  }

  if (IMAGE_EXTENSIONS.includes(ext as AllowedFileExtension)) {
    return "image";
  }

  if (FONT_EXTENSIONS.includes(ext as AllowedFileExtension)) {
    return "font";
  }

  if (VIDEO_EXTENSIONS.includes(ext as AllowedFileExtension)) {
    return "video";
  }

  return "file";
};

/**
 * Safely decode a URL path fragment, preventing path traversal attacks
 * @throws Error if the decoded path contains path traversal attempts
 */
export const decodePathFragment = (fragment: string): string => {
  const decoded = decodeURIComponent(fragment);

  // Prevent path traversal attacks
  if (decoded.includes("..") || decoded.startsWith("/")) {
    throw new Error("Invalid file path");
  }

  return decoded;
};

/**
 * Generates the appropriate URL for an asset based on its type and format.
 * - Images use /cgi/image/ with format=raw
 * - All other assets (videos, audio, fonts, documents) use /cgi/asset/ with format=raw
 *
 * @param asset - The asset to generate URL for
 * @param origin - Origin to prepend (e.g., "https://example.com"). When provided, returns an absolute URL.
 * @returns A URL object. Use .pathname for relative paths, .href for absolute URLs
 */
export const getAssetUrl = (asset: Asset, origin: string): URL => {
  let path: string;
  const assetType = detectAssetType(asset.name);

  if (assetType === "image") {
    path = `/cgi/image/${asset.name}?format=raw`;
  } else {
    // Videos, audio, fonts, documents all use /cgi/asset/
    path = `/cgi/asset/${asset.name}?format=raw`;
  }

  return new URL(path, origin);
};

/**
 * Runtime asset data structure with only fields needed at runtime.
 * This is a simplified version of the Asset type, optimized for client-side usage.
 */
export type RuntimeAsset = {
  url: string;
  width?: number;
  height?: number;
  family?: string;
  style?: string;
  weight?: number;
};

/**
 * Type-specific metadata extractors that define what runtime data each asset type needs.
 * Adding a new asset type requires implementing its extractor here.
 */
type RuntimeMetadata = Omit<RuntimeAsset, "url"> | undefined;

const extractImageMetadata = (asset: Asset): RuntimeMetadata => {
  if (asset.type !== "image") {
    return;
  }
  // Only include dimensions if they're non-zero
  if (asset.meta.width && asset.meta.height) {
    return {
      width: asset.meta.width,
      height: asset.meta.height,
    };
  }
};

const extractFontMetadata = (asset: Asset): RuntimeMetadata => {
  if (asset.type !== "font") {
    return;
  }
  const metadata: Omit<RuntimeAsset, "url"> = {
    family: asset.meta.family,
  };
  // Static fonts have style and weight, variable fonts have variationAxes
  if ("style" in asset.meta) {
    metadata.style = asset.meta.style;
    metadata.weight = asset.meta.weight;
  }
  return metadata;
};

const extractFileMetadata = (_asset: Asset): RuntimeMetadata => {
  // Generic files don't need additional metadata at runtime
  return;
};

const metadataExtractors: Record<
  Asset["type"],
  (asset: Asset) => RuntimeMetadata
> = {
  image: extractImageMetadata,
  font: extractFontMetadata,
  file: extractFileMetadata,
};

/**
 * Converts a full Asset to a minimal RuntimeAsset format.
 * This reduces payload size by including only runtime-needed data.
 *
 * Each asset type defines its own metadata extractor to ensure we only
 * include the fields that are actually needed at runtime.
 *
 * @param asset - The full asset object
 * @param origin - Origin to use for generating the asset URL (only used for URL construction, result is always a relative path)
 * @returns A minimal RuntimeAsset object with relative URL
 */
export const toRuntimeAsset = (asset: Asset, origin: string): RuntimeAsset => {
  const extractor = metadataExtractors[asset.type];
  const metadata = extractor(asset);

  const url = getAssetUrl(asset, origin);
  // Use pathname + search to get the relative path with query string
  const relativeUrl = url.pathname + url.search;

  return {
    url: relativeUrl,
    ...metadata,
  };
};
