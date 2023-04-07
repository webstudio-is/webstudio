import { describe, test, expect } from "@jest/globals";
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
});
