import { describe, test, expect, vi, afterEach } from "vitest";
import {
  acceptFileTypeSpecifier,
  validateFiles,
  acceptUploadType,
} from "./asset-upload";

const mockToast = vi.hoisted(() => ({
  error: vi.fn(),
}));

vi.mock("@webstudio-is/design-system", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@webstudio-is/design-system")>();
  return {
    ...actual,
    toast: mockToast,
  };
});

describe("validateFiles", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("returns all files when under size limit", () => {
    const smallFile1 = new File(["a".repeat(1000)], "small1.jpg", {
      type: "image/jpeg",
    });
    const smallFile2 = new File(["b".repeat(2000)], "small2.jpg", {
      type: "image/jpeg",
    });

    const result = validateFiles([smallFile1, smallFile2]);

    expect(result).toHaveLength(2);
    expect(result).toContain(smallFile1);
    expect(result).toContain(smallFile2);
    expect(mockToast.error).not.toHaveBeenCalled();
  });

  test("filters out files exceeding size limit and shows toast error", () => {
    const smallFile = new File(["a".repeat(1000)], "small.jpg", {
      type: "image/jpeg",
    });
    // Create a file object with a large size property (without actually creating the data)
    const largeFile = new File(["content"], "large.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(largeFile, "size", {
      value: 5 * 1024 * 1024, // 5MB (exceeds 4.5MB limit)
    });

    const result = validateFiles([smallFile, largeFile]);

    expect(result).toHaveLength(1);
    expect(result).toContain(smallFile);
    expect(mockToast.error).toHaveBeenCalledWith(
      'Asset "large.jpg" cannot be bigger than 4.5MB'
    );
  });

  test("shows multiple toast errors for multiple large files", () => {
    const largeFile1 = new File(["content1"], "large1.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(largeFile1, "size", {
      value: 5 * 1024 * 1024, // 5MB
    });

    const largeFile2 = new File(["content2"], "large2.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(largeFile2, "size", {
      value: 5 * 1024 * 1024, // 5MB
    });

    const result = validateFiles([largeFile1, largeFile2]);

    expect(result).toHaveLength(0);
    expect(mockToast.error).toHaveBeenCalledTimes(2);
    expect(mockToast.error).toHaveBeenCalledWith(
      'Asset "large1.jpg" cannot be bigger than 4.5MB'
    );
    expect(mockToast.error).toHaveBeenCalledWith(
      'Asset "large2.jpg" cannot be bigger than 4.5MB'
    );
  });
});

describe("acceptFileTypeSpecifier", () => {
  test("accepts wildcard *", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    expect(acceptFileTypeSpecifier("*", jpegFile)).toBe(true);
    expect(acceptFileTypeSpecifier("*", pdfFile)).toBe(true);
  });

  test("accepts mime type wildcards like image/*", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pngFile = new File([], "image.png", { type: "image/png" });
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    expect(acceptFileTypeSpecifier("image/*", jpegFile)).toBe(true);
    expect(acceptFileTypeSpecifier("image/*", pngFile)).toBe(true);
    expect(acceptFileTypeSpecifier("image/*", pdfFile)).toBe(false);
  });

  test("accepts specific mime types", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pngFile = new File([], "image.png", { type: "image/png" });

    expect(acceptFileTypeSpecifier("image/jpeg", jpegFile)).toBe(true);
    expect(acceptFileTypeSpecifier("image/jpeg", pngFile)).toBe(false);
  });

  test("accepts file extensions", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pngFile = new File([], "image.png", { type: "image/png" });

    expect(acceptFileTypeSpecifier(".jpg", jpegFile)).toBe(true);
    expect(acceptFileTypeSpecifier(".jpg", pngFile)).toBe(false);
  });

  test("accepts multiple specifiers", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pngFile = new File([], "image.png", { type: "image/png" });
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    expect(acceptFileTypeSpecifier("image/jpeg, image/png", jpegFile)).toBe(
      true
    );
    expect(acceptFileTypeSpecifier("image/jpeg, image/png", pngFile)).toBe(
      true
    );
    expect(acceptFileTypeSpecifier("image/jpeg, image/png", pdfFile)).toBe(
      false
    );
  });

  test("handles mixed specifiers", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pngFile = new File([], "image.png", { type: "image/png" });
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    expect(acceptFileTypeSpecifier(".jpg, image/png", jpegFile)).toBe(true);
    expect(acceptFileTypeSpecifier(".jpg, image/png", pngFile)).toBe(true);
    expect(acceptFileTypeSpecifier(".jpg, image/png", pdfFile)).toBe(false);
  });

  test("handles whitespace in specifiers", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });

    expect(acceptFileTypeSpecifier(" image/jpeg , image/png ", jpegFile)).toBe(
      true
    );
  });
});

describe("acceptUploadType", () => {
  test("uses custom accept string when provided", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    expect(acceptUploadType("file", "image/*", jpegFile)).toBe(true);
    expect(acceptUploadType("file", "image/*", pdfFile)).toBe(false);
  });

  test("uses acceptMap for asset type when accept is undefined", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    expect(acceptUploadType("image", undefined, jpegFile)).toBe(true);
    expect(acceptUploadType("image", undefined, pdfFile)).toBe(false);
  });

  test("accepts all files when acceptMap has undefined for type", () => {
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    expect(acceptUploadType("file", undefined, jpegFile)).toBe(true);
    expect(acceptUploadType("file", undefined, pdfFile)).toBe(true);
  });

  test("accepts font files for font type", () => {
    const woffFile = new File([], "font.woff", { type: "font/woff" });
    const jpegFile = new File([], "image.jpg", { type: "image/jpeg" });

    expect(acceptUploadType("font", undefined, woffFile)).toBe(true);
    expect(acceptUploadType("font", undefined, jpegFile)).toBe(false);
  });

  test("respects custom accept over default type mapping", () => {
    const pdfFile = new File([], "document.pdf", { type: "application/pdf" });

    // Even though type is "image", custom accept="*" should allow PDF
    expect(acceptUploadType("image", "*", pdfFile)).toBe(true);
  });
});
