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
  getAssetUrl,
  toRuntimeAsset,
  acceptToMimePatterns,
  acceptToMimeCategories,
  getAssetMime,
  doesAssetMatchMimePatterns,
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
      expect(isAllowedMimeCategory("image")).toBe(true);
      expect(isAllowedMimeCategory("video")).toBe(true);
      expect(isAllowedMimeCategory("audio")).toBe(true);
      expect(isAllowedMimeCategory("font")).toBe(true);
      expect(isAllowedMimeCategory("text")).toBe(true);
      expect(isAllowedMimeCategory("application")).toBe(true);
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
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("image");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("font");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("text");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("application");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("audio");
      expect(FILE_EXTENSIONS_BY_CATEGORY).toHaveProperty("video");
    });

    test("image category contains image extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.image).toContain("jpg");
      expect(FILE_EXTENSIONS_BY_CATEGORY.image).toContain("png");
      expect(FILE_EXTENSIONS_BY_CATEGORY.image).toContain("gif");
      expect(FILE_EXTENSIONS_BY_CATEGORY.image).toContain("svg");
    });

    test("font category contains font extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.font).toContain("woff");
      expect(FILE_EXTENSIONS_BY_CATEGORY.font).toContain("woff2");
      expect(FILE_EXTENSIONS_BY_CATEGORY.font).toContain("ttf");
      expect(FILE_EXTENSIONS_BY_CATEGORY.font).toContain("otf");
    });

    test("application category contains document extensions", () => {
      // Office documents
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("pdf");
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("doc");
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("docx");
      // Spreadsheets
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("xls");
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("xlsx");
      // Presentations
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("ppt");
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("pptx");
      // Archives
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("zip");
      expect(FILE_EXTENSIONS_BY_CATEGORY.application).toContain("rar");
    });

    test("text category contains text file extensions", () => {
      expect(FILE_EXTENSIONS_BY_CATEGORY.text).toContain("txt");
      expect(FILE_EXTENSIONS_BY_CATEGORY.text).toContain("md");
      expect(FILE_EXTENSIONS_BY_CATEGORY.text).toContain("csv");
      expect(FILE_EXTENSIONS_BY_CATEGORY.text).toContain("js");
      expect(FILE_EXTENSIONS_BY_CATEGORY.text).toContain("css");
      expect(FILE_EXTENSIONS_BY_CATEGORY.text).toContain("html");
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

    test("handles normal filenames", () => {
      expect(decodePathFragment("image.jpg")).toBe("image.jpg");
      expect(decodePathFragment("my-file.pdf")).toBe("my-file.pdf");
      expect(decodePathFragment("file_123.png")).toBe("file_123.png");
    });
  });

  describe("getAssetUrl", () => {
    const mockImageAsset = {
      id: "image-1",
      name: "photo.jpg",
      projectId: "project-1",
      size: 1024,
      type: "image" as const,
      format: "jpg",
      description: "",
      createdAt: "2024-01-01",
      meta: { width: 100, height: 100 },
    };

    const mockVideoAsset = {
      id: "video-1",
      name: "video.mp4",
      projectId: "project-1",
      size: 2048,
      type: "file" as const,
      format: "mp4",
      description: "",
      createdAt: "2024-01-01",
      meta: {},
    };

    const mockFontAsset = {
      id: "font-1",
      name: "font.woff2",
      projectId: "project-1",
      size: 512,
      type: "font" as const,
      format: "woff2" as const,
      description: "",
      createdAt: "2024-01-01",
      meta: { family: "Arial", style: "normal" as const, weight: 400 },
    };

    const mockGenericAsset = {
      id: "doc-1",
      name: "document.pdf",
      projectId: "project-1",
      size: 4096,
      type: "file" as const,
      format: "pdf",
      description: "",
      createdAt: "2024-01-01",
      meta: {},
    };

    test("generates correct URL for image assets", () => {
      const url = getAssetUrl(mockImageAsset, "https://example.com");
      expect(url.href).toBe(
        "https://example.com/cgi/image/photo.jpg?format=raw"
      );
      expect(url.pathname).toBe("/cgi/image/photo.jpg");
      expect(url.search).toBe("?format=raw");
    });

    test("generates correct URL for video assets", () => {
      const url = getAssetUrl(mockVideoAsset, "https://example.com");
      expect(url.href).toBe(
        "https://example.com/cgi/asset/video.mp4?format=raw"
      );
      expect(url.pathname).toBe("/cgi/asset/video.mp4");
    });

    test("generates correct URL for font assets", () => {
      const url = getAssetUrl(mockFontAsset, "https://example.com");
      expect(url.href).toBe(
        "https://example.com/cgi/asset/font.woff2?format=raw"
      );
      expect(url.pathname).toBe("/cgi/asset/font.woff2");
    });

    test("generates correct URL for generic file assets", () => {
      const url = getAssetUrl(mockGenericAsset, "https://example.com");
      expect(url.href).toBe(
        "https://example.com/cgi/asset/document.pdf?format=raw"
      );
      expect(url.pathname).toBe("/cgi/asset/document.pdf");
    });

    test("works with different origins", () => {
      const url1 = getAssetUrl(mockImageAsset, "https://example.com");
      const url2 = getAssetUrl(mockImageAsset, "http://localhost:3000");
      const url3 = getAssetUrl(mockImageAsset, "https://cdn.example.org");

      expect(url1.origin).toBe("https://example.com");
      expect(url2.origin).toBe("http://localhost:3000");
      expect(url3.origin).toBe("https://cdn.example.org");

      // All should have the same pathname
      expect(url1.pathname).toBe(url2.pathname);
      expect(url2.pathname).toBe(url3.pathname);
    });

    test("pathname can be used for relative URLs", () => {
      const url = getAssetUrl(mockGenericAsset, "https://example.com");
      expect(url.pathname).toBe("/cgi/asset/document.pdf");
      // pathname is suitable for href attribute in same-origin context
    });

    test("detects video format case-insensitively", () => {
      const upperCaseVideo = {
        ...mockVideoAsset,
        format: "MP4",
      };
      const url = getAssetUrl(upperCaseVideo, "https://example.com");
      expect(url.pathname).toBe("/cgi/asset/video.mp4");
    });

    test("handles assets with special characters in name", () => {
      const specialAsset = {
        ...mockGenericAsset,
        name: "my document (1).pdf",
      };
      const url = getAssetUrl(specialAsset, "https://example.com");
      // URL constructor automatically encodes special characters in pathname
      expect(url.pathname).toBe("/cgi/asset/my%20document%20(1).pdf");
    });
  });

  describe("acceptToMimePatterns", () => {
    test("returns * if accept is empty or * or */*", () => {
      expect(acceptToMimePatterns("")).toBe("*");
      expect(acceptToMimePatterns("*")).toBe("*");
      expect(acceptToMimePatterns("*/*")).toBe("*");
      expect(acceptToMimePatterns("*,.png")).toBe("*");
    });

    test("returns * if it doesn't recognise a pattern", () => {
      expect(acceptToMimePatterns("image/wrong")).toBe("*");
      expect(acceptToMimePatterns("wrong/*")).toBe("*");
      expect(acceptToMimePatterns(".wrong")).toBe("*");
    });

    test("leaves full mimes as is", () => {
      expect(acceptToMimePatterns("image/png,font/otf")).toEqual(
        new Set(["image/png", "font/otf"])
      );
    });

    test("leaves mime patterns as is", () => {
      expect(acceptToMimePatterns("image/*,font/*")).toEqual(
        new Set(["image/*", "font/*"])
      );
    });

    test("converts extensions to mimes", () => {
      expect(acceptToMimePatterns(".svg,.otf")).toEqual(
        new Set(["image/svg+xml", "font/otf"])
      );
    });
  });

  describe("acceptToMimeCategories", () => {
    test("returns * if accept is empty or * or */*", () => {
      expect(acceptToMimeCategories("")).toBe("*");
      expect(acceptToMimeCategories("*")).toBe("*");
      expect(acceptToMimeCategories("*/*")).toBe("*");
      expect(acceptToMimeCategories("*,.png")).toBe("*");
    });

    test("returns * if it doesn't recognise a pattern", () => {
      expect(acceptToMimeCategories("image/wrong")).toBe("*");
      expect(acceptToMimeCategories("wrong/*")).toBe("*");
      expect(acceptToMimeCategories(".wrong")).toBe("*");
    });

    test("handles full mimes", () => {
      expect(acceptToMimeCategories("image/png,font/otf")).toEqual(
        new Set(["image", "font"])
      );
    });

    test("handles mime patterns", () => {
      expect(acceptToMimeCategories("image/*,font/*")).toEqual(
        new Set(["image", "font"])
      );
    });

    test("handles extensions", () => {
      expect(acceptToMimeCategories(".svg,.otf")).toEqual(
        new Set(["image", "font"])
      );
    });
  });

  describe("getAssetMime", () => {
    test("handles woff", () => {
      expect(getAssetMime({ type: "font", format: "woff" })).toBe("font/woff");
    });

    test("handles png", () => {
      expect(getAssetMime({ type: "image", format: "png" })).toBe("image/png");
    });

    test("handles svg", () => {
      expect(getAssetMime({ type: "image", format: "svg" })).toBe(
        "image/svg+xml"
      );
    });

    test("returns undefined for unknown format", () => {
      expect(
        getAssetMime({ type: "image", format: "unknown" })
      ).toBeUndefined();
    });
  });

  describe("doesAssetMatchMimePatterns", () => {
    test("returns true if mime patterns is *", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "png", name: "test.png" },
          "*"
        )
      ).toBe(true);
    });

    test("handles full mimes", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "svg", name: "test.svg" },
          new Set(["image/svg+xml"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "svg", name: "test.svg" },
          new Set(["image/png"])
        )
      ).toBe(false);
    });

    test("handles mime patterns", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "svg", name: "test.svg" },
          new Set(["image/*"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "svg", name: "test.svg" },
          new Set(["font/*"])
        )
      ).toBe(false);
    });

    test("if asset format has unexpected value, returns false", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "unknown", name: "test.unknown" },
          new Set(["image/*"])
        )
      ).toBe(false);
    });

    test("handles uppercase format extensions", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "JPG", name: "test.JPG" },
          new Set(["image/*"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "PNG", name: "test.PNG" },
          new Set(["image/png"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "font", format: "WOFF2", name: "font.WOFF2" },
          new Set(["font/*"])
        )
      ).toBe(true);
    });

    test("handles normal image assets", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "jpg", name: "test.jpg" },
          new Set(["image/*"])
        )
      ).toBe(true);
    });

    test("handles legacy assets with type 'file' but image extension", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "jpg", name: "test.jpg" },
          new Set(["image/*"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "JPG", name: "test.JPG" },
          new Set(["image/*"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "png", name: "test.png" },
          new Set(["image/*"])
        )
      ).toBe(true);
    });

    test("handles legacy assets with type 'file' but font extension", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "woff2", name: "font.woff2" },
          new Set(["font/*"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "ttf", name: "font.ttf" },
          new Set(["font/*"])
        )
      ).toBe(true);
    });

    test("handles video assets stored as type 'file'", () => {
      // Videos are always stored as type "file" in the database
      // They should match video/* patterns via normal MIME matching
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "mp4", name: "video.mp4" },
          new Set(["video/*"])
        )
      ).toBe(true);
    });

    test("does not match legacy file assets with wrong pattern", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "jpg", name: "test.jpg" },
          new Set(["font/*"])
        )
      ).toBe(false);
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "pdf", name: "doc.pdf" },
          new Set(["image/*"])
        )
      ).toBe(false);
    });

    test("handles real file assets (not legacy)", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "pdf", name: "doc.pdf" },
          new Set(["application/*"])
        )
      ).toBe(true);
    });

    test("handles assets without extension in name", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "unknown", name: "test" },
          new Set(["image/*"])
        )
      ).toBe(false);
    });

    test("handles assets with mismatched format and extension", () => {
      // Format says jpg but filename says png - should match based on format first
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "jpg", name: "test.png" },
          new Set(["image/*"])
        )
      ).toBe(true);
      // If format is unknown, falls back to filename extension
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "unknown", name: "test.png" },
          new Set(["image/*"])
        )
      ).toBe(true);
    });

    test("handles uppercase extensions in filenames", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "unknown", name: "test.JPG" },
          new Set(["image/*"])
        )
      ).toBe(true);
    });

    test("handles specific MIME types with fallback", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "unknown", name: "test.jpg" },
          new Set(["image/jpeg"])
        )
      ).toBe(true);
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "unknown", name: "test.jpg" },
          new Set(["image/png"])
        )
      ).toBe(false);
    });

    test("handles multiple patterns with fallback", () => {
      expect(
        doesAssetMatchMimePatterns(
          { type: "file", format: "unknown", name: "test.jpg" },
          new Set(["image/png", "image/jpeg", "image/gif"])
        )
      ).toBe(true);
    });

    test("only uses fallback for type 'file' assets", () => {
      // Image type with unknown format should not fallback to name
      expect(
        doesAssetMatchMimePatterns(
          { type: "image", format: "unknown", name: "test.jpg" },
          new Set(["image/*"])
        )
      ).toBe(false);
    });
  });

  describe("toRuntimeAsset", () => {
    const mockImageAsset = {
      id: "image-1",
      name: "photo.jpg",
      projectId: "project-1",
      size: 1024,
      type: "image" as const,
      format: "jpg",
      description: "A photo",
      createdAt: "2024-01-01",
      meta: { width: 1920, height: 1080 },
    };

    const mockFontAsset = {
      id: "font-1",
      name: "font.woff2",
      projectId: "project-1",
      size: 512,
      type: "font" as const,
      format: "woff2" as const,
      description: null,
      createdAt: "2024-01-01",
      meta: {
        family: "Arial",
        style: "normal" as const,
        weight: 400,
      },
    };

    const mockVariableFontAsset = {
      id: "font-2",
      name: "variable-font.woff2",
      projectId: "project-1",
      size: 768,
      type: "font" as const,
      format: "woff2" as const,
      description: null,
      createdAt: "2024-01-01",
      meta: {
        family: "Inter",
        variationAxes: {},
      },
    };

    const mockGenericAsset = {
      id: "doc-1",
      name: "document.pdf",
      projectId: "project-1",
      size: 4096,
      type: "file" as const,
      format: "pdf",
      description: null,
      createdAt: "2024-01-01",
      meta: {},
    };

    test("converts image asset with all fields", () => {
      const result = toRuntimeAsset(mockImageAsset, "https://example.com");
      expect(result).toEqual({
        url: "/cgi/image/photo.jpg?format=raw",
        width: 1920,
        height: 1080,
      });
    });

    test("converts static font asset with metadata", () => {
      const result = toRuntimeAsset(mockFontAsset, "https://example.com");
      expect(result).toEqual({
        url: "/cgi/asset/font.woff2?format=raw",
        family: "Arial",
        style: "normal",
        weight: 400,
      });
    });

    test("converts variable font asset without style/weight", () => {
      const result = toRuntimeAsset(
        mockVariableFontAsset,
        "https://example.com"
      );
      expect(result).toEqual({
        url: "/cgi/asset/variable-font.woff2?format=raw",
        family: "Inter",
      });
    });

    test("converts generic file asset with minimal fields", () => {
      const result = toRuntimeAsset(mockGenericAsset, "https://example.com");
      expect(result).toEqual({
        url: "/cgi/asset/document.pdf?format=raw",
      });
    });

    test("returns relative URLs regardless of origin", () => {
      const result1 = toRuntimeAsset(mockImageAsset, "https://cdn.example.com");
      const result2 = toRuntimeAsset(mockImageAsset, "http://localhost:3000");
      // Both should return the same relative URL
      expect(result1.url).toBe("/cgi/image/photo.jpg?format=raw");
      expect(result2.url).toBe("/cgi/image/photo.jpg?format=raw");
    });

    test("handles image without dimensions", () => {
      const assetWithoutDimensions = {
        ...mockImageAsset,
        meta: { width: 0, height: 0 },
      };
      const result = toRuntimeAsset(
        assetWithoutDimensions,
        "https://example.com"
      );
      expect(result).not.toHaveProperty("width");
      expect(result).not.toHaveProperty("height");
    });
  });
});
