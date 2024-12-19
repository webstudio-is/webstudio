// Utils related to MIME types and the `accept` attribute value format
// https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#accept

import warnOnce from "warn-once";
import type { Asset } from "@webstudio-is/sdk";

const mimeCategories = [
  "image",
  "audio",
  "video",
  "font",
  "text",
  "application",
] as const;

type MimeCategory = (typeof mimeCategories)[number];

const extensionToMime = new Map([
  [".avif", "image/avif"],
  [".bmp", "image/bmp"],
  [".gif", "image/gif"],
  [".ico", "image/vnd.microsoft.icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".tif", "image/tiff"],
  [".tiff", "image/tiff"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
]);

const mimeTypes = new Set(extensionToMime.values());

const mimePatterns = new Set([
  ...mimeTypes.values(),
  ...mimeCategories.map((category): `${MimeCategory}/*` => `${category}/*`),
]);

const getCategory = (pattern: string): MimeCategory => {
  const categoryAsString = pattern.split("/")[0];
  const category = mimeCategories.find(
    (category) => category === categoryAsString
  );
  if (category === undefined) {
    throw new Error(`Invalid mime pattern: ${pattern}`);
  }
  return category;
};

/** `".svg,font/otf,text/*"` -> `"image/svg+xml", "font/otf", "text/*"` */
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

/** `".svg,font/otf,text/*"` -> `"image", "font", "text"` */
export const acceptToMimeCategories = (accept: string): Set<string> | "*" => {
  const patterns = acceptToMimePatterns(accept);
  if (patterns === "*") {
    return "*";
  }
  return new Set(Array.from(patterns).map(getCategory));
};

export const getAssetMime = ({
  type,
  format,
}: {
  type: "image" | "font";
  format: string;
}): string | undefined => {
  const mime = `${type}/${format}`;
  if (mimeTypes.has(mime)) {
    return mime;
  }
  const mime2 = extensionToMime.get(`.${format}`);
  if (mime2 === undefined) {
    warnOnce(
      true,
      `Couldn't determine mime type of asset: ${type}, ${format}.`
    );
  }
  return mime2;
};

export const doesAssetMatchMimePatterns = (
  asset: Pick<Asset, "format" | "type">,
  patterns: Set<string> | "*"
): boolean => {
  if (patterns === "*") {
    return true;
  }

  const mime = getAssetMime(asset);

  if (mime === undefined) {
    return false;
  }

  return patterns.has(mime) || patterns.has(`${getCategory(mime)}/*`);
};

// Didn't delete because we may need this later
// From https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
// const extentionToMime: [
//   string,
//   Array<`${(typeof mimeCategories)[number]}/${string}`>
// ][] = [
//   [".aac", ["audio/aac"]], // AAC audio
//   [".abw", ["application/x-abiword"]], // AbiWord document
//   [".arc", ["application/x-freearc"]], // Archive document (multiple files embedded)
//   [".avif", ["image/avif"]], // AVIF image
//   [".avi", ["video/x-msvideo"]], // AVI: Audio Video Interleave
//   [".azw", ["application/vnd.amazon.ebook"]], // Amazon Kindle eBook format
//   [".bin", ["application/octet-stream"]], // Any kind of binary data
//   [".bmp", ["image/bmp"]], // Windows OS/2 Bitmap Graphics
//   [".bz", ["application/x-bzip"]], // BZip archive
//   [".bz2", ["application/x-bzip2"]], // BZip2 archive
//   [".cda", ["application/x-cdf"]], // CD audio
//   [".csh", ["application/x-csh"]], // C-Shell script
//   [".css", ["text/css"]], // Cascading Style Sheets (CSS)
//   [".csv", ["text/csv"]], // Comma-separated values (CSV)
//   [".doc", ["application/msword"]], // Microsoft Word
//   [
//     ".docx",
//     ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
//   ], // Microsoft Word (OpenXML)
//   [".eot", ["application/vnd.ms-fontobject"]], // MS Embedded OpenType fonts
//   [".epub", ["application/epub+zip"]], // Electronic publication (EPUB)
//   [".gz", ["application/gzip"]], // GZip Compressed Archive
//   [".gif", ["image/gif"]], // Graphics Interchange Format (GIF)
//   [".htm", ["text/html"]], // HyperText Markup Language (HTML)
//   [".html", ["text/html"]],
//   [".ico", ["image/vnd.microsoft.icon"]], // Icon format
//   [".ics", ["text/calendar"]], // iCalendar format
//   [".jar", ["application/java-archive"]], // Java Archive (JAR)
//   [".jpeg", ["image/jpeg"]], // JPEG images
//   [".jpg", ["image/jpeg"]],
//   [".js", ["text/javascript"]], // JavaScript
//   [".json", ["application/json"]], // JSON format
//   [".jsonld", ["application/ld+json"]], // JSON-LD format
//   [".mid", ["audio/midi", "audio/x-midi"]], // Musical Instrument Digital Interface (MIDI)
//   [".midi", ["audio/midi", "audio/x-midi"]],
//   [".mjs", ["text/javascript"]], // JavaScript module
//   [".mp3", ["audio/mpeg"]], // MP3 audio
//   [".mp4", ["video/mp4"]], // MP4 video
//   [".mpeg", ["video/mpeg"]], // MPEG Video
//   [".mpkg", ["application/vnd.apple.installer+xml"]], // Apple Installer Package
//   [".odp", ["application/vnd.oasis.opendocument.presentation"]], // OpenDocument presentation document
//   [".ods", ["application/vnd.oasis.opendocument.spreadsheet"]], // OpenDocument spreadsheet document
//   [".odt", ["application/vnd.oasis.opendocument.text"]], // OpenDocument text document
//   [".oga", ["audio/ogg"]], // OGG audio
//   [".ogv", ["video/ogg"]], // OGG video
//   [".ogx", ["application/ogg"]], // OGG
//   [".opus", ["audio/opus"]], // Opus audio
//   [".otf", ["font/otf"]], // OpenType font
//   [".png", ["image/png"]], // Portable Network Graphics
//   [".pdf", ["application/pdf"]], // Adobe Portable Document Format (PDF)
//   [".php", ["application/x-httpd-php"]], // Hypertext Preprocessor (Personal Home Page)
//   [".ppt", ["application/vnd.ms-powerpoint"]], // Microsoft PowerPoint
//   [
//     ".pptx",
//     [
//       "application/vnd.openxmlformats-officedocument.presentationml.presentation",
//     ],
//   ], // Microsoft PowerPoint (OpenXML)
//   [".rar", ["application/vnd.rar"]], // RAR archive
//   [".rtf", ["application/rtf"]], // Rich Text Format (RTF)
//   [".sh", ["application/x-sh"]], // Bourne shell script
//   [".svg", ["image/svg+xml"]], // Scalable Vector Graphics (SVG)
//   [".tar", ["application/x-tar"]], // Tape Archive (TAR)
//   [".tif", ["image/tiff"]], // Tagged Image File Format (TIFF)
//   [".tiff", ["image/tiff"]],
//   [".ts", ["video/mp2t"]], // MPEG transport stream
//   [".ttf", ["font/ttf"]], // TrueType Font
//   [".txt", ["text/plain"]], // Text, (generally ASCII or ISO 8859-n)
//   [".vsd", ["application/vnd.visio"]], // Microsoft Visio
//   [".wav", ["audio/wav"]], // Waveform Audio Format
//   [".weba", ["audio/webm"]], // WEBM audio
//   [".webm", ["video/webm"]], // WEBM video
//   [".webp", ["image/webp"]], // WEBP image
//   [".woff", ["font/woff"]], // Web Open Font Format (WOFF)
//   [".woff2", ["font/woff2"]], // Web Open Font Format (WOFF)
//   [".xhtml", ["application/xhtml+xml"]], // XHTML
//   [".xls", ["application/vnd.ms-excel"]], // Microsoft Excel
//   [
//     ".xlsx",
//     ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
//   ], // Microsoft Excel (OpenXML)
//   [".xml", ["application/xml", "text/xml"]], // XML
//   [".xul", ["application/vnd.mozilla.xul+xml"]], // XUL
//   [".zip", ["application/zip"]], // ZIP archive
//   [".3gp", ["video/3gpp", "audio/3gpp"]], // 3GPP audio/video container
//   [".3g2", ["video/3gpp2", "audio/3gpp2"]], // 3GPP2 audio/video container
//   [".7z", ["application/x-7z-compressed"]], // 7-zip archive
// ];
