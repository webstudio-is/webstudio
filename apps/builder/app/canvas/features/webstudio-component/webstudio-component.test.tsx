/**
 * @vitest-environment jsdom
 */
import { describe, test, expect } from "vitest";
import { __testing__ } from "./webstudio-component";

const { computeComponentKey } = __testing__;

describe("computeComponentKey - key generation logic", () => {
  test("prioritizes assetId over other props", () => {
    expect(
      computeComponentKey({
        $webstudio$canvasOnly$assetId: "asset-123",
        src: "/image.jpg",
        defaultValue: "default",
      })
    ).toBe("asset-123");
  });

  test("falls back to defaultValue when no assetId", () => {
    expect(
      computeComponentKey({
        src: "/image.jpg",
        defaultValue: "default-value",
      })
    ).toBe("default-value");
  });

  test("uses src when no assetId or defaultValue", () => {
    expect(
      computeComponentKey({
        src: "/path/to/video.mp4",
      })
    ).toBe("/path/to/video.mp4");
  });

  test("returns undefined when no relevant props", () => {
    expect(computeComponentKey({})).toBeUndefined();
  });

  test("handles null and undefined values", () => {
    expect(
      computeComponentKey({
        src: null,
        defaultValue: undefined,
      })
    ).toBeUndefined();
  });

  test("coerces defaultValue to string", () => {
    expect(computeComponentKey({ defaultValue: 42 })).toBe("42");
    expect(computeComponentKey({ defaultValue: true })).toBe("true");
    expect(computeComponentKey({ defaultValue: 0 })).toBe("0");
  });

  test("coerces src to string", () => {
    expect(computeComponentKey({ src: "string-src" })).toBe("string-src");
    expect(computeComponentKey({ src: 123 })).toBe("123");
    expect(computeComponentKey({ src: undefined })).toBeUndefined();
  });

  test("different assetIds produce different keys", () => {
    const key1 = computeComponentKey({
      $webstudio$canvasOnly$assetId: "asset-123",
      src: "/image.jpg",
    });
    const key2 = computeComponentKey({
      $webstudio$canvasOnly$assetId: "asset-456",
      src: "/image.jpg",
    });

    expect(key1).not.toBe(key2);
  });

  test("different src values produce different keys", () => {
    const key1 = computeComponentKey({ src: "/assets/video1.mp4" });
    const key2 = computeComponentKey({ src: "/assets/video2.mp4" });

    expect(key1).not.toBe(key2);
  });
});
