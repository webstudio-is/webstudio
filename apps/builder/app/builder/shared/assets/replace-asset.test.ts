import { describe, test, expect } from "vitest";
import type { StyleValue } from "@webstudio-is/css-engine";
import { __testing__ } from "./replace-asset";

const { replaceAssetInStyleValue } = __testing__;

describe("replaceAssetInStyleValue", () => {
  test("replaces asset id in a direct image value", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "asset", value: "old-id" },
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "image",
      value: { type: "asset", value: "new-id" },
    });
  });

  test("does not mutate image value with a different asset id", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "asset", value: "other-id" },
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "image",
      value: { type: "asset", value: "other-id" },
    });
  });

  test("does not mutate image value with url type", () => {
    const value: StyleValue = {
      type: "image",
      value: { type: "url", url: "https://example.com/img.png" },
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "image",
      value: { type: "url", url: "https://example.com/img.png" },
    });
  });

  test("replaces asset id inside a tuple value", () => {
    const value: StyleValue = {
      type: "tuple",
      value: [
        { type: "image", value: { type: "asset", value: "old-id" } },
        { type: "image", value: { type: "asset", value: "other-id" } },
      ],
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "tuple",
      value: [
        { type: "image", value: { type: "asset", value: "new-id" } },
        { type: "image", value: { type: "asset", value: "other-id" } },
      ],
    });
  });

  test("replaces asset id inside a layers value", () => {
    const value: StyleValue = {
      type: "layers",
      value: [
        { type: "image", value: { type: "asset", value: "old-id" } },
        { type: "image", value: { type: "asset", value: "old-id" } },
      ],
    };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({
      type: "layers",
      value: [
        { type: "image", value: { type: "asset", value: "new-id" } },
        { type: "image", value: { type: "asset", value: "new-id" } },
      ],
    });
  });

  test("does not mutate non-image value types", () => {
    const value: StyleValue = { type: "keyword", value: "auto" };
    replaceAssetInStyleValue(value, "old-id", "new-id");
    expect(value).toEqual({ type: "keyword", value: "auto" });
  });
});
