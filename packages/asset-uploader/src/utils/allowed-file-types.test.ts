import { describe, test, expect } from "vitest";
import {
  ALLOWED_FILE_TYPES,
  getMimeTypeByExtension,
  getMimeTypeByFilename,
  isAllowedExtension,
  isAllowedMimeCategory,
  validateFileName,
  getImageExtensions,
  getImageMimeTypes,
  getVideoExtensions,
  getVideoMimeTypes,
  isVideoFormat,
  getFileExtensionsByCategory,
} from "./allowed-file-types";

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

  describe("getImageExtensions", () => {
    test("returns an array", () => {
      const extensions = getImageExtensions();
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);
    });

    test("all returned extensions are image types", () => {
      const extensions = getImageExtensions();
      extensions.forEach((ext) => {
        const mimeType = getMimeTypeByExtension(ext);
        expect(mimeType?.startsWith("image/")).toBe(true);
      });
    });
  });

  describe("getImageMimeTypes", () => {
    test("returns an array of MIME types", () => {
      const mimeTypes = getImageMimeTypes();
      expect(Array.isArray(mimeTypes)).toBe(true);
      expect(mimeTypes.length).toBeGreaterThan(0);
    });

    test("all MIME types start with image/", () => {
      const mimeTypes = getImageMimeTypes();
      mimeTypes.forEach((mime) => {
        expect(mime.startsWith("image/")).toBe(true);
      });
    });
  });

  describe("getVideoExtensions", () => {
    test("returns an array", () => {
      const extensions = getVideoExtensions();
      expect(Array.isArray(extensions)).toBe(true);
      expect(extensions.length).toBeGreaterThan(0);
    });

    test("all returned extensions are video types", () => {
      const extensions = getVideoExtensions();
      extensions.forEach((ext) => {
        const mimeType = getMimeTypeByExtension(ext);
        expect(mimeType?.startsWith("video/")).toBe(true);
      });
    });
  });

  describe("getVideoMimeTypes", () => {
    test("returns an array of MIME types", () => {
      const mimeTypes = getVideoMimeTypes();
      expect(Array.isArray(mimeTypes)).toBe(true);
      expect(mimeTypes.length).toBeGreaterThan(0);
    });

    test("all MIME types start with video/", () => {
      const mimeTypes = getVideoMimeTypes();
      mimeTypes.forEach((mime) => {
        expect(mime.startsWith("video/")).toBe(true);
      });
    });
  });

  describe("isVideoFormat", () => {
    test("returns true for valid video formats", () => {
      expect(isVideoFormat("mp4")).toBe(true);
      expect(isVideoFormat("webm")).toBe(true);
      expect(isVideoFormat("mov")).toBe(true);
      expect(isVideoFormat("avi")).toBe(true);
    });

    test("is case-insensitive", () => {
      expect(isVideoFormat("MP4")).toBe(true);
      expect(isVideoFormat("WEBM")).toBe(true);
      expect(isVideoFormat("MoV")).toBe(true);
    });

    test("returns false for non-video formats", () => {
      expect(isVideoFormat("jpg")).toBe(false);
      expect(isVideoFormat("png")).toBe(false);
      expect(isVideoFormat("pdf")).toBe(false);
      expect(isVideoFormat("mp3")).toBe(false);
    });

    test("returns false for invalid formats", () => {
      expect(isVideoFormat("xyz")).toBe(false);
      expect(isVideoFormat("")).toBe(false);
    });
  });

  describe("getFileExtensionsByCategory", () => {
    test("returns object with all expected categories", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories).toHaveProperty("images");
      expect(categories).toHaveProperty("fonts");
      expect(categories).toHaveProperty("documents");
      expect(categories).toHaveProperty("spreadsheets");
      expect(categories).toHaveProperty("presentations");
      expect(categories).toHaveProperty("code");
      expect(categories).toHaveProperty("text");
      expect(categories).toHaveProperty("audio");
      expect(categories).toHaveProperty("video");
    });

    test("images category contains image extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.images).toContain("jpg");
      expect(categories.images).toContain("png");
      expect(categories.images).toContain("gif");
      expect(categories.images).toContain("svg");
    });

    test("fonts category contains font extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.fonts).toContain("woff");
      expect(categories.fonts).toContain("woff2");
      expect(categories.fonts).toContain("ttf");
      expect(categories.fonts).toContain("otf");
    });

    test("documents category contains document extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.documents).toContain("pdf");
      expect(categories.documents).toContain("doc");
      expect(categories.documents).toContain("docx");
    });

    test("spreadsheets category contains spreadsheet extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.spreadsheets).toContain("xls");
      expect(categories.spreadsheets).toContain("xlsx");
      expect(categories.spreadsheets).toContain("csv");
    });

    test("presentations category contains presentation extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.presentations).toContain("ppt");
      expect(categories.presentations).toContain("pptx");
    });

    test("code category contains code file extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.code).toContain("js");
      expect(categories.code).toContain("css");
      expect(categories.code).toContain("json");
      expect(categories.code).toContain("html");
      expect(categories.code).toContain("xml");
    });

    test("text category contains text file extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.text).toContain("txt");
      expect(categories.text).toContain("md");
    });

    test("audio category contains audio extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.audio).toContain("mp3");
      expect(categories.audio).toContain("wav");
      expect(categories.audio).toContain("ogg");
    });

    test("video category contains video extensions", () => {
      const categories = getFileExtensionsByCategory();
      expect(categories.video).toContain("mp4");
      expect(categories.video).toContain("webm");
      expect(categories.video).toContain("mov");
      expect(categories.video).toContain("avi");
    });

    test("all extensions are accounted for", () => {
      const categories = getFileExtensionsByCategory();
      const allCategoryExtensions = Object.values(categories).flat();
      const allExtensions = Object.keys(ALLOWED_FILE_TYPES);

      // Every extension should be in at least one category
      allExtensions.forEach((ext) => {
        expect(allCategoryExtensions).toContain(ext);
      });
    });
  });
});
