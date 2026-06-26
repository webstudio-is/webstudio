import { describe, test, expect } from "vitest";
import type { StyleValue } from "@webstudio-is/css-engine";
import { createDefaultPages } from "@webstudio-is/project-build";
import type { StyleDecl } from "@webstudio-is/sdk";
import {
  createAssetReplacementPayload,
  findAsset,
  replaceAssetInStyleValueMutable,
  replaceAssetMutable,
} from "~/shared/asset-style-value";

const replaceAssetInStyleValue = (
  value: StyleValue,
  fromAssetId: string,
  toAssetId: string
) => replaceAssetInStyleValueMutable(value, { fromAssetId, toAssetId });

describe("replaceAssetInStyleValue", () => {
  test("finds assets by id", () => {
    expect(
      findAsset(
        [
          { id: "asset-1", type: "image" },
          { id: "asset-2", type: "image" },
        ] as never,
        "asset-2"
      )
    ).toEqual({ id: "asset-2", type: "image" });
    expect(findAsset([], "missing")).toBeUndefined();
  });

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

  test("replaces font family when provided", () => {
    const value: StyleValue = {
      type: "fontFamily",
      value: ["Inter", "sans-serif"],
    };
    replaceAssetInStyleValueMutable(value, {
      fromAssetId: "old-id",
      toAssetId: "new-id",
      fromFontFamily: "Inter",
      toFontFamily: "Roboto",
    });
    expect(value).toEqual({
      type: "fontFamily",
      value: ["Roboto", "sans-serif"],
    });
  });

  test("replaces asset references in pages props and styles", () => {
    const pages = createDefaultPages({ rootInstanceId: "root" });
    pages.meta = { faviconAssetId: "old-id" };
    const homePage = pages.pages.get(pages.homePageId);
    if (homePage === undefined) {
      throw new Error("Expected home page");
    }
    homePage.meta.socialImageAssetId = "old-id";
    homePage.marketplace = { thumbnailAssetId: "old-id" };
    const prop = {
      id: "prop",
      instanceId: "root",
      name: "src",
      type: "asset" as const,
      value: "old-id",
    };
    const style: StyleDecl = {
      styleSourceId: "local",
      breakpointId: "base",
      property: "backgroundImage",
      value: {
        type: "image" as const,
        value: { type: "asset" as const, value: "old-id" },
      },
    };

    replaceAssetMutable({
      pages,
      props: [prop],
      styles: [style],
      replacement: { fromAssetId: "old-id", toAssetId: "new-id" },
    });

    expect(pages.meta.faviconAssetId).toBe("new-id");
    expect(homePage.meta.socialImageAssetId).toBe("new-id");
    expect(homePage.marketplace.thumbnailAssetId).toBe("new-id");
    expect(prop.value).toBe("new-id");
    expect(style.value).toEqual({
      type: "image",
      value: { type: "asset", value: "new-id" },
    });
  });

  test("creates asset replacement payload", () => {
    const pages = createDefaultPages({ rootInstanceId: "root" });
    pages.meta = { faviconAssetId: "old-id" };
    const homePage = pages.pages.get(pages.homePageId);
    if (homePage === undefined) {
      throw new Error("Expected home page");
    }
    homePage.meta.socialImageAssetId = "old-id";

    expect(
      createAssetReplacementPayload({
        build: {
          pages,
          props: [
            {
              id: "prop",
              instanceId: "root",
              name: "src",
              type: "asset",
              value: "old-id",
            },
          ],
          styles: [
            {
              styleSourceId: "local",
              breakpointId: "base",
              property: "backgroundImage",
              value: {
                type: "image",
                value: { type: "asset", value: "old-id" },
              },
            },
          ],
        } as never,
        fromAsset: {
          id: "old-id",
          type: "image",
        } as never,
        toAsset: {
          id: "new-id",
          type: "image",
        } as never,
      })
    ).toEqual([
      {
        namespace: "pages",
        patches: [
          {
            op: "replace",
            path: ["meta", "faviconAssetId"],
            value: "new-id",
          },
          {
            op: "replace",
            path: ["pages", pages.homePageId, "meta", "socialImageAssetId"],
            value: "new-id",
          },
        ],
      },
      {
        namespace: "props",
        patches: [
          {
            op: "replace",
            path: ["prop"],
            value: {
              id: "prop",
              instanceId: "root",
              name: "src",
              type: "asset",
              value: "new-id",
            },
          },
        ],
      },
      {
        namespace: "styles",
        patches: [
          {
            op: "replace",
            path: ["local:base:backgroundImage:"],
            value: {
              styleSourceId: "local",
              breakpointId: "base",
              property: "backgroundImage",
              value: {
                type: "image",
                value: { type: "asset", value: "new-id" },
              },
            },
          },
        ],
      },
      {
        namespace: "assets",
        patches: [{ op: "remove", path: ["old-id"] }],
      },
    ]);
  });
});
