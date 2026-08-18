import { describe, expect, test } from "vitest";
import {
  discoverAssetValueReferences,
  mergeAssetUrlSuffix,
  resolveAssetValueReferences,
} from "./asset-value-references";

describe("structured asset value references", () => {
  test("discovers nested object and array values relative to the source document", () => {
    const properties = {
      featureImage: "./assets/hero.png",
      openGraph: { image: "../shared/social.png#cover" },
      gallery: ["./assets/first.png?width=800", { src: "missing.png" }],
      external: "https://example.com/image.png",
      rootRelative: "/images/hero.png",
      fragment: "#hero",
    };

    expect(
      discoverAssetValueReferences({
        properties,
        sourcePath: "blog/posts/article.md",
        assetIdsByPath: new Map([
          ["blog/posts/assets/hero.png", "hero"],
          ["blog/shared/social.png", "social"],
          ["blog/posts/assets/first.png", "first"],
        ]),
      })
    ).toEqual([
      {
        path: ["properties", "featureImage"],
        assetId: "hero",
      },
      {
        path: ["properties", "openGraph", "image"],
        assetId: "social",
        suffix: "#cover",
      },
      {
        path: ["properties", "gallery", 0],
        assetId: "first",
        suffix: "?width=800",
      },
    ]);
  });

  test("leaves missing and non-unique paths undiscovered", () => {
    expect(
      discoverAssetValueReferences({
        properties: {
          ambiguous: "./hero.png",
          missing: "./missing.png",
          stableId: "asset-id",
        },
        sourcePath: "posts/article.json",
        assetIdsByPath: new Map([["images/hero.png", "asset-id"]]),
      })
    ).toEqual([
      {
        path: ["properties", "stableId"],
        assetId: "asset-id",
      },
    ]);
  });

  test("resolves published Asset paths from sibling folders", () => {
    const properties = {
      relative: "./assets/inception_TDxBrdPwfoJJe_A-k5jhB.png",
      rootRelative: "/assets/inception_TDxBrdPwfoJJe_A-k5jhB.png",
    };
    const references = discoverAssetValueReferences({
      properties,
      sourcePath: "content/data/inception.json",
      assetIdsByPath: new Map([
        [
          "content/images/inception_TDxBrdPwfoJJe_A-k5jhB.png",
          "inception-image",
        ],
      ]),
    });

    expect(references).toEqual([
      {
        path: ["properties", "relative"],
        assetId: "inception-image",
      },
      {
        path: ["properties", "rootRelative"],
        assetId: "inception-image",
      },
    ]);
    expect(
      resolveAssetValueReferences({
        value: { properties },
        references,
        assetUrls: {
          "inception-image":
            "/cgi/image/inception_TDxBrdPwfoJJe_A-k5jhB.png?format=raw",
        },
      })
    ).toEqual({
      properties: {
        relative: "/cgi/image/inception_TDxBrdPwfoJJe_A-k5jhB.png?format=raw",
        rootRelative:
          "/cgi/image/inception_TDxBrdPwfoJJe_A-k5jhB.png?format=raw",
      },
    });
  });

  test("resolves without mutating source values and merges URL suffixes", () => {
    const value = {
      properties: {
        image: "./hero.png?width=1200#cover",
        gallery: ["./first.png"],
      },
    };

    const resolved = resolveAssetValueReferences({
      value,
      references: [
        {
          path: ["properties", "image"],
          assetId: "hero",
          suffix: "?width=1200#cover",
        },
        {
          path: ["properties", "gallery", 0],
          assetId: "first",
        },
      ],
      runtimeAssets: {
        hero: { url: "/cgi/image/hero.png?format=raw" },
        first: { url: "/cgi/image/first.png?format=raw" },
      },
    });

    expect(resolved).toEqual({
      properties: {
        image: "/cgi/image/hero.png?format=raw&width=1200#cover",
        gallery: ["/cgi/image/first.png?format=raw"],
      },
    });
    expect(value.properties.image).toBe("./hero.png?width=1200#cover");
    expect(
      mergeAssetUrlSuffix(
        "https://cdn.example.com/guide.pdf?format=raw",
        "?download=1#section"
      )
    ).toBe("https://cdn.example.com/guide.pdf?format=raw&download=1#section");
  });

  test("resolves an explicit asset marker to structured metadata", () => {
    const properties = {
      featureImage: { $ref: "./assets/hero.png?width=1200#cover" },
      external: "https://example.com/image.png",
    };
    const references = discoverAssetValueReferences({
      properties,
      sourcePath: "blog/post.md",
      assetIdsByPath: new Map([["blog/assets/hero.png", "hero"]]),
      structuredAssetIds: new Set(["hero"]),
    });

    expect(references).toEqual([
      {
        path: ["properties", "featureImage"],
        assetId: "hero",
        suffix: "?width=1200#cover",
        structured: true,
      },
    ]);
    expect(
      resolveAssetValueReferences({
        value: { properties },
        references,
        runtimeAssets: {
          hero: {
            url: "/cgi/image/hero.png?format=raw",
            name: "hero.png",
            description: "A mountain at sunrise",
            mimeType: "image/png",
            size: 1024,
            meta: { width: 1600, height: 900 },
            width: 1600,
            height: 900,
          },
        },
      })
    ).toEqual({
      properties: {
        featureImage: {
          id: "hero",
          src: "/cgi/image/hero.png?format=raw&width=1200#cover",
          name: "hero.png",
          description: "A mountain at sunrise",
          mimeType: "image/png",
          size: 1024,
          meta: { width: 1600, height: 900 },
          width: 1600,
          height: 900,
        },
        external: "https://example.com/image.png",
      },
    });
  });
});
