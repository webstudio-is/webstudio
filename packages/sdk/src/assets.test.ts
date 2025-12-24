import { describe, test, expect } from "vitest";
import {
  ALLOWED_FILE_TYPES,
  getMimeTypeByExtension,
  getMimeTypeByFilename,
  isAllowedExtension,
  isAllowedMimeCategory,
  validateFileName,
  IMAGE_EXTENSIONS,
  IMAGE_MIME_TYPES,
  VIDEO_EXTENSIONS,
  VIDEO_MIME_TYPES,
  FONT_EXTENSIONS,
  FILE_EXTENSIONS_BY_CATEGORY,
  detectAssetType,
  decodePathFragment,
} from "./assets";

describe("allowed-file-types", () => {
  describe("getMimeTypeByExtension", () => {
    test("returns correct MIME type for valid extension", () => {
      expect(getMimeTypeByExtension("jpg")).toBe("image/jpeg");
      expect(getMimeTypeByExtension("png")).toBe("image/png");
      expect(getMimeTypeByExtension("pdf")).toBe("application/pdf");
      expect(getMimeTypeByExtension("mp4")).toBe("video/mp4");
    });

    test("is case-insensitive", () => {
      expect(getMimeTypeByExtension("JPG")).toBe("image/jpeg");
      expect(getMimeTypeByExtension("PNG")).toBe("image/png");
      expect(getMimeTypeByExtension("PDF")).toBe("application/pdf");
    });

    test("returns undefined for invalid extension", () => {
      expect(getMimeTypeByExtension("exe")).toBeUndefined();
      expect(getMimeTypeByExtension("xyz")).toBeUndefined();
    });
  });

  describe("getMimeTypeByFilename", () => {
    test("extracts extension and returns MIME type", () => {
      expect(getMimeTypeByFilename("image.jpg")).toBe("image/jpeg");
      expect(getMimeTypeByFilename("document.pdf")).toBe("application/pdf");
      expect(getMimeTypeByFilename("video.mp4")).toBe("video/mp4");
    });

    test("handles files with multiple dots", () => {
      expect(getMimeTypeByFilename("my.file.name.jpg")).toBe("image/jpeg");
      expect(getMimeTypeByFilename("archive.tar.gz")).toBe(
        "application/octet-stream"
      );
    });

    test("is case-insensitive", () => {
      expect(getMimeTypeByFilename("IMAGE.JPG")).toBe("image/jpeg");
      expect(getMimeTypeByFilename("Document.PDF")).toBe("application/pdf");
    });

    test("returns octet-stream for invalid extension", () => {
      expect(getMimeTypeByFilename("file.exe")).toBe(
        "application/octet-stream"
      );
      expect(getMimeTypeByFilename("file.xyz")).toBe(
        "application/octet-stream"
      );
    });

    test("returns octet-stream for files without extension", () => {
      expect(getMimeTypeByFilename("filename")).toBe(
        "application/octet-stream"
      );
      expect(getMimeTypeByFilename("")).toBe("application/octet-stream");
    });
  });

  describe("isAllowedExtension", () => {
    test("returns true for valid extensions", () => {
      expect(isAllowedExtension("jpg")).toBe(true);
      expect(isAllowedExtension("png")).toBe(true);
      expect(isAllowedExtension("pdf")).toBe(true);
      expect(isAllowedExtension("mp4")).toBe(true);
    });

    test("is case-insensitive", () => {
      expect(isAllowedExtension("JPG")).toBe(true);
      expect(isAllowedExtension("PNG")).toBe(true);
      expect(isAllowedExtension("PDF")).toBe(true);
    });

    test("returns false for invalid extensions", () => {
      expect(isAllowedExtension("exe")).toBe(false);
      expect(isAllowedExtension("sh")).toBe(false);
      expect(isAllowedExtension("bat")).toBe(false);
    });
  });

  describe("isAllowedMimeCategory", () => {
    test("returns true for valid MIME categories", () => {
      expect(isAllowedMimeCategory("image/jpeg")).toBe(true);
      expect(isAllowedMimeCategory("video/mp4")).toBe(true);
      expect(isAllowedMimeCategory("audio/mpeg")).toBe(true);
      expect(isAllowedMimeCategory("font/woff")).toBe(true);
      expect(isAllowedMimeCategory("text/plain")).toBe(true);
      expect(isAllowedMimeCategory("application/pdf")).toBe(true);
    });

    test("returns false for invalid MIME categories", () => {
      expect(isAllowedMimeCategory("executable/binary")).toBe(false);
      expect(isAllowedMimeCategory("script/javascript")).toBe(false);
    });

    test("handles malformed MIME types", () => {
      expect(isAllowedMimeCategory("notamimetype")).toBe(false);
      expect(isAllowedMimeCategory("")).toBe(false);
    });
  });

  describe("validateFileName", () => {
    test("returns extension and MIME type for valid files", () => {
      expect(validateFileName("image.jpg")).toEqual({
        extension: "jpg",
        mimeType: "image/jpeg",
      });
      expect(validateFileName("document.pdf")).toEqual({
        extension: "pdf",
        mimeType: "application/pdf",
      });
    });

    test("is case-insensitive", () => {
      expect(validateFileName("IMAGE.JPG")).toEqual({
        extension: "jpg",
        mimeType: "image/jpeg",
      });
    });

    test("handles files with multiple dots", () => {
      expect(validateFileName("my.file.name.png")).toEqual({
        extension: "png",
        mimeType: "image/png",
      });
    });

    test("throws error for files without extension", () => {
      expect(() => validateFileName("filename")).toThrow(
        'File type "filename" is not allowed'
      );
      // Empty string results in no extension either
      expect(() => validateFileName("file.")).toThrow(
        "File must have an extension"
      );
    });

    test("throws error for disallowed extensions", () => {
      expect(() => validateFileName("malware.exe")).toThrow(
        'File type "exe" is not allowed'
      );
      expect(() => validateFileName("script.sh")).toThrow(
        'File type "sh" is not allowed'
      );
    });

    test("error message includes list of allowed types", () => {
      try {
        validateFileName("bad.xyz");
      } catch (error) {
        expect((error as Error).message).toContain("Allowed types:");
        expect((error as Error).message).toContain("jpg");
        expect((error as Error).message).toContain("png");
      }
    });
  });

  describe("IMAGE_EXTENSIONS", () => {
    test("is an array", () => {
      expect(Array.isArray(IMAGE_EXTENSIONS)).toBe(true);
      expect(IMAGE_EXTENSIONS.length).toBeGreaterThan(0);
    });

    test("all extensions are image types", () => {
      IMAGE_EXTENSIONS.forEach((ext) => {
        const mimeType = getMimeTypeByExtension(ext);
        expect(mimeType?.startsWith("image/")).toBe(true);
      });
    });
  });

  describe("IMAGE_MIME_TYPES", () => {
    test("is an array of MIME types", () => {
      expect(Array.isArray(IMAGE_MIME_TYPES)).toBe(true);
      expect(IMAGE_MIME_TYPES.length).toBeGreaterThan(0);
    });

    test("all MIME types start with image/", () => {
      IMAGE_MIME_TYPES.forEach((mime) => {
        expect(mime.startsWith("image/")).toBe(true);
      });
    });
  });

  describe("VIDEO_EXTENSIONS", () => {
    test("is an array", () => {
      expect(Array.isArray(VIDEO_EXTENSIONS)).toBe(true);
      expect(VIDEO_EXTENSIONS.length).toBeGreaterThan(0);
    });

    test("all extensions are video types", () => {
      VIDEO_EXTENSIONS.forEach((ext) => {
        const mimeType = getMimeTypeByExtension(ext);
        expect(mimeType?.startsWith("video/")).toBe(true);
      });
    });
  });

  describe("VIDEO_MIME_TYPES", () => {
    test("is an array of MIME types", () => {
      expect(Array.isArray(VIDEO_MIME_TYPES)).toBe(true);
      expect(VIDEO_MIME_TYPES.length).toBeGreaterThan(0);
    });

    test("all MIME types start with video/", () => {
      VIDEO_MIME_TYPES.forEach((mime) => {
        expect(mime.startsWith("video/")).toBe(true);
      });
    });
  });

  describe("FONT_EXTENSIONS", () => {
    test("is an array", () => {
      expect(Array.isArray(FONT_EXTENSIONS)).toBe(true);
      expect(FONT_EXTENSIONS.length).toBeGreaterThan(0);
    });

    test("all extensions are font types", () => {
      FONT_EXTENSIONS.forEach((ext) => {
        const mimeType = getMimeTypeByExtension(ext);
        expect(mimeType?.startsWith("font/")).toBe(true);
      });
    });

    test("includes common font formats", () => {
      expect(FONT_EXTENSIONS).toContain("woff");
      expect(FONT_EXTENSIONS).toContain("woff2");
      expect(FONT_EXTENSIONS).toContain("ttf");
      expect(FONT_EXTENSIONS).toContain("otf");
    });
  });

  describe("FILE_EXTENSIONS_BY_CATEGORY", () => {
    test("has all expected categories", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("images");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("fonts");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("documents");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("code");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("audio");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("video");
    });

    test("images category contains image extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.images).toContain("jpg");
      expect(FILE_EXTENSIONS_BY_CATEGORY.images).toContain("png");
      expect(FILE_EXTENSIONS_BY_CATEGORY.images).toContain("gif");
      expect(FILE_EXTENSIONS_BY_CATEGORY.images).toContain("svg");
    });

    test("fonts category contains font extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.fonts).toContain("woff");
      expect(FILE_EXTENSIONS_BY_CATEGORY.fonts).toContain("woff2");
      expect(FILE_EXTENSIONS_BY_CATEGORY.fonts).toContain("ttf");
      expect(FILE_EXTENSIONS_BY_CATEGORY.fonts).toContain("otf");
    });

    test("documents category contains all document extensions", () => {
      // Office documents
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("pdf");
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("doc");
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("docx");
      // Spreadsheets
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("xls");
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("xlsx");
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("csv");
      // Presentations
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("ppt");
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("pptx");
      // Text files
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("txt");
      expect(FILE_EXTENSIONS_BY_CATEGORY.documents).toContain("md");
    });

    test("code category contains code file extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.code).toContain("js");
      expect(FILE_EXTENSIONS_BY_CATEGORY.code).toContain("css");
      expect(FILE_EXTENSIONS_BY_CATEGORY.code).toContain("json");
      expect(FILE_EXTENSIONS_BY_CATEGORY.code).toContain("html");
      expect(FILE_EXTENSIONS_BY_CATEGORY.code).toContain("xml");
    });

    test("audio category contains audio extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.audio).toContain("mp3");
      expect(FILE_EXTENSIONS_BY_CATEGORY.audio).toContain("wav");
      expect(FILE_EXTENSIONS_BY_CATEGORY.audio).toContain("ogg");
    });

    test("video category contains video extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.video).toContain("mp4");
      expect(FILE_EXTENSIONS_BY_CATEGORY.video).toContain("webm");
      expect(FILE_EXTENSIONS_BY_CATEGORY.video).toContain("mov");
      expect(FILE_EXTENSIONS_BY_CATEGORY.video).toContain("avi");
    });

    test("all extensions are accounted for", () => {
      const allCategoryExtensions = Object.values(
        FILE_EXTENSIONS_BY_CATEGORY
      ).flat();
      const allExtensions = Object.keys(ALLOWED_FILE_TYPES);

      // Every extension should be in at least one category
      allExtensions.forEach((ext) => {
        expect(allCategoryExtensions).toContain(ext);
      });
    });
  });

  describe("detectAssetType", () => {
    test("detects image files", () => {
      expect(detectAssetType("photo.jpg")).toBe("image");
      expect(detectAssetType("image.png")).toBe("image");
      expect(detectAssetType("graphic.gif")).toBe("image");
      expect(detectAssetType("vector.svg")).toBe("image");
      expect(detectAssetType("picture.webp")).toBe("image");
    });

    test("detects font files", () => {
      expect(detectAssetType("font.woff")).toBe("font");
      expect(detectAssetType("font.woff2")).toBe("font");
      expect(detectAssetType("font.ttf")).toBe("font");
      expect(detectAssetType("font.otf")).toBe("font");
    });

    test("detects video files", () => {
      expect(detectAssetType("video.mp4")).toBe("video");
      expect(detectAssetType("video.webm")).toBe("video");
      expect(detectAssetType("video.mov")).toBe("video");
      expect(detectAssetType("video.avi")).toBe("video");
    });

    test("returns file for other types", () => {
      expect(detectAssetType("document.pdf")).toBe("file");
      expect(detectAssetType("audio.mp3")).toBe("file");
      expect(detectAssetType("data.json")).toBe("file");
      expect(detectAssetType("doc.docx")).toBe("file");
    });

    test("is case-insensitive", () => {
      expect(detectAssetType("PHOTO.JPG")).toBe("image");
      expect(detectAssetType("FONT.WOFF2")).toBe("font");
      expect(detectAssetType("VIDEO.MP4")).toBe("video");
      expect(detectAssetType("DOC.PDF")).toBe("file");
    });

    test("handles files without extension", () => {
      expect(detectAssetType("filename")).toBe("file");
    });

    test("handles files with multiple dots", () => {
      expect(detectAssetType("my.photo.file.png")).toBe("image");
      expect(detectAssetType("my.font.file.woff2")).toBe("font");
      expect(detectAssetType("my.video.file.mp4")).toBe("video");
      expect(detectAssetType("my.doc.file.pdf")).toBe("file");
    });
  });

  describe("decodePathFragment", () => {
    test("decodes URI components correctly", () => {
      expect(decodePathFragment("hello%20world.jpg")).toBe("hello world.jpg");
      expect(decodePathFragment("image%2Btest.png")).toBe("image+test.png");
      expect(decodePathFragment("file%40name.pdf")).toBe("file@name.pdf");
    });

    test("throws error on path traversal attempts with ..", () => {
      expect(() => decodePathFragment("../secret.txt")).toThrow(
        "Invalid file path"
      );
      expect(() => decodePathFragment("folder/../secret.txt")).toThrow(
        "Invalid file path"
      );
      expect(() => decodePathFragment("..%2Fsecret.txt")).toThrow(
        "Invalid file path"
      );
    });

    test("throws error on absolute path attempts", () => {
      expect(() => decodePathFragment("/etc/passwd")).toThrow(
        "Invalid file path"
      );
      expect(() => decodePathFragment("%2Fetc%2Fpasswd")).toThrow(
        "Invalid file path"
      );
    });

    test("allows normal filenames and paths", () => {
      expect(decodePathFragment("image.jpg")).toBe("image.jpg");
      expect(decodePathFragment("folder/image.jpg")).toBe("folder/image.jpg");
      expect(decodePathFragment("my-file_123.png")).toBe("my-file_123.png");
    });
  });
});
