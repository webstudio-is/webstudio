import { describe, test, expect } from "vitest";
import {
  acceptToMimePatterns,
  acceptToMimeCategories,
  getAssetMime,
  doesAssetMatchMimePatterns,
} from "./mime";

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
    expect(getAssetMime({ type: "image", format: "unknown" })).toBeUndefined();
  });
});

describe("doesAssetMatchMimePatterns", () => {
  test("returns true if mime patterns is *", () => {
    expect(
      doesAssetMatchMimePatterns({ type: "image", format: "png" }, "*")
    ).toBe(true);
  });

  test("handles full mimes", () => {
    expect(
      doesAssetMatchMimePatterns(
        { type: "image", format: "svg" },
        new Set(["image/svg+xml"])
      )
    ).toBe(true);
    expect(
      doesAssetMatchMimePatterns(
        { type: "image", format: "svg" },
        new Set(["image/png"])
      )
    ).toBe(false);
  });

  test("handles mime patterns", () => {
    expect(
      doesAssetMatchMimePatterns(
        { type: "image", format: "svg" },
        new Set(["image/*"])
      )
    ).toBe(true);
    expect(
      doesAssetMatchMimePatterns(
        { type: "image", format: "svg" },
        new Set(["font/*"])
      )
    ).toBe(false);
  });

  test("if asset format has unexpected value, returns false", () => {
    expect(
      doesAssetMatchMimePatterns(
        { type: "image", format: "unknown" },
        new Set(["image/*"])
      )
    ).toBe(false);
  });

  test("handles uppercase format extensions", () => {
    expect(
      doesAssetMatchMimePatterns(
        { type: "image", format: "JPG" },
        new Set(["image/*"])
      )
    ).toBe(true);
    expect(
      doesAssetMatchMimePatterns(
        { type: "image", format: "PNG" },
        new Set(["image/png"])
      )
    ).toBe(true);
    expect(
      doesAssetMatchMimePatterns(
        { type: "font", format: "WOFF2" },
        new Set(["font/*"])
      )
    ).toBe(true);
  });
});

describe("doesAssetMatchMimePatterns with name fallback", () => {
  test("returns true if mime patterns is *", () => {
    expect(
      doesAssetMatchMimePatterns(
        { type: "file", format: "jpg", name: "test.jpg" },
        "*"
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
