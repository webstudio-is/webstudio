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

  // Spreadsheets
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",

  // Presentations
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  // Text/Code
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
export const ALLOWED_FILE_EXTENSIONS: ReadonlySet<string> = new Set<string>(
  Object.keys(ALLOWED_FILE_TYPES)
);

/**
 * Set of allowed MIME type categories
 */
export const ALLOWED_MIME_CATEGORIES: ReadonlySet<string> = new Set([
  "image",
  "video",
  "audio",
  "font",
  "text",
  "application",
]);

/**
 * All image file extensions
 */
export const IMAGE_EXTENSIONS: readonly string[] = Object.keys(
  ALLOWED_FILE_TYPES
).filter((ext) => {
  const mimeType = ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES];
  return mimeType.startsWith("image/");
});

/**
 * All image MIME types
 */
export const IMAGE_MIME_TYPES: readonly string[] = IMAGE_EXTENSIONS.map(
  (ext) => ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES]
);

/**
 * All video file extensions
 */
export const VIDEO_EXTENSIONS: readonly string[] = Object.keys(
  ALLOWED_FILE_TYPES
).filter((ext) => {
  const mimeType = ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES];
  return mimeType.startsWith("video/");
});

/**
 * All video MIME types
 */
export const VIDEO_MIME_TYPES: readonly string[] = VIDEO_EXTENSIONS.map(
  (ext) => ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES]
);

/**
 * All font file extensions
 */
export const FONT_EXTENSIONS: readonly string[] = Object.keys(
  ALLOWED_FILE_TYPES
).filter((ext) => {
  const mimeType = ALLOWED_FILE_TYPES[ext as keyof typeof ALLOWED_FILE_TYPES];
  return mimeType.startsWith("font/");
});

/**
 * File extensions grouped by user-friendly categories for UI display
 */
export const FILE_EXTENSIONS_BY_CATEGORY: Readonly<{
  images: string[];
  fonts: string[];
  documents: string[];
  code: string[];
  audio: string[];
  video: string[];
}> = (() => {
  const categories = {
    images: [] as string[],
    fonts: [] as string[],
    documents: [] as string[],
    code: [] as string[],
    audio: [] as string[],
    video: [] as string[],
  };

  Object.entries(ALLOWED_FILE_TYPES).forEach(([ext, mimeType]) => {
    const [category, subtype] = mimeType.split("/");

    if (category === "image") {
      categories.images.push(ext);
    } else if (category === "font") {
      categories.fonts.push(ext);
    } else if (category === "audio") {
      categories.audio.push(ext);
    } else if (category === "video") {
      categories.video.push(ext);
    } else if (category === "text") {
      // CSV and text files belong in documents
      if (
        ["javascript", "css", "html", "xml"].some((t) => subtype.includes(t))
      ) {
        categories.code.push(ext);
      } else {
        categories.documents.push(ext);
      }
    } else if (category === "application") {
      // Check for specific code file types (but not office docs that contain "xml" in MIME type)
      if (
        (subtype.includes("json") || subtype === "xml") &&
        !subtype.includes("officedocument")
      ) {
        categories.code.push(ext);
      } else {
        // All other application types (PDF, Word, Excel, PowerPoint, etc.) go to documents
        categories.documents.push(ext);
      }
    }
  });

  return categories as Readonly<typeof categories>;
})();

export type FileCategory = keyof typeof FILE_EXTENSIONS_BY_CATEGORY;

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
  return ALLOWED_FILE_EXTENSIONS.has(extension.toLowerCase());
};

/**
 * Check if a MIME type category is allowed
 */
export const isAllowedMimeCategory = (mimeType: string): boolean => {
  const category = mimeType.split("/")[0];
  return ALLOWED_MIME_CATEGORIES.has(category);
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

  if (IMAGE_EXTENSIONS.includes(ext)) {
    return "image";
  }

  if (FONT_EXTENSIONS.includes(ext)) {
    return "font";
  }

  if (VIDEO_EXTENSIONS.includes(ext)) {
    return "video";
  }

  return "file";
};

/**
 * Generates the appropriate URL for an asset based on its type and format.
 * - Images use /cgi/image/ with format=raw
 * - Videos use /cgi/video/
 * - Other assets use /cgi/asset/
 *
 * @param asset - The asset to generate URL for
 * @param origin - Optional origin to prepend (e.g., "https://example.com")
 * @returns A URL instance for the asset
 */
export const getAssetUrl = (asset: Asset, origin?: string): URL => {
  let path: string;

  if (asset.type === "image") {
    path = `/cgi/image/${asset.name}?format=raw`;
  } else if (VIDEO_EXTENSIONS.includes(asset.format.toLowerCase())) {
    path = `/cgi/video/${asset.name}`;
  } else {
    path = `/cgi/asset/${asset.name}`;
  }

  // Use a base URL if no origin provided, for relative URL construction
  const base = origin ?? "http://localhost";
  return new URL(path, base);
};
