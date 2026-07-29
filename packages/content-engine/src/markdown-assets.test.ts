import { describe, expect, test } from "vitest";
import {
  discoverMarkdownAssetReferences,
  rewriteMarkdownAssetReferences,
} from "./markdown-assets";

describe("Markdown asset references", () => {
  test("resolves conventional references against the Markdown file's folder", () => {
    const references = discoverMarkdownAssetReferences({
      sourcePath: "blog/posts/2026/hello.md",
      markdown: `
![Cover](./cover.png)
![Hero](../../images/hero%20image.png#crop)
[Download](./files/guide.pdf?download=1)
[Shared](../../../shared/press-kit.zip)
[Website](https://example.com)
[Section](#section)
      `,
      assetIdsByPath: new Map([
        ["blog/posts/2026/cover.png", "cover"],
        ["blog/images/hero image.png", "hero"],
        ["blog/posts/2026/files/guide.pdf", "guide"],
        ["shared/press-kit.zip", "press-kit"],
      ]),
    });

    expect(references).toEqual({
      "./cover.png": "cover",
      "../../images/hero%20image.png#crop": "hero",
      "./files/guide.pdf?download=1": "guide",
      "../../../shared/press-kit.zip": "press-kit",
    });
  });

  test("does not treat absolute, root-relative, fragment, or malformed URLs as Asset references", () => {
    const references = discoverMarkdownAssetReferences({
      sourcePath: "blog/post.md",
      markdown: `
[Absolute](https://example.com/file.pdf)
[Protocol relative](//example.com/file.pdf)
[Root relative](/images/hero.png)
[Email](mailto:hello@example.com)
[Fragment](#section)
[Malformed](./images/hero%2Fimage.png)
      `,
      assetIdsByPath: new Map([
        ["blog/images/hero/image.png", "encoded-slash"],
        ["images/hero.png", "root-relative"],
      ]),
    });

    expect(references).toEqual({});
  });

  test("treats reserved characters in folder names as path characters", () => {
    expect(
      discoverMarkdownAssetReferences({
        sourcePath: "blog/special # ? %/post.md",
        markdown: "![Hero](./hero.png)",
        assetIdsByPath: new Map([["blog/special # ? %/hero.png", "hero"]]),
      })
    ).toEqual({ "./hero.png": "hero" });
  });

  test("rewrites references while preserving query strings and fragments", () => {
    const markdown = `
![Hero](../images/hero.png#crop)

[Download][guide]

[guide]: ./guide.pdf?download=1

| Image |
| --- |
| ![Table image](./table.png) |
    `.trim();
    const references = {
      "../images/hero.png#crop": "hero",
      "./guide.pdf?download=1": "guide",
      "./table.png": "table",
    };

    const result = rewriteMarkdownAssetReferences({
      markdown,
      references,
      assetUrls: {
        hero: "/assets/hero.png",
        guide: "/assets/guide.pdf",
        table: "/assets/table.png",
      },
    });

    expect(result).toContain("/assets/hero.png#crop");
    expect(result).toContain("/assets/guide.pdf?download=1");
    expect(result).toContain("/assets/table.png");
    expect(result).toContain("| Image");
  });

  test("leaves Markdown unchanged when no runtime URL is available", () => {
    const markdown = "![Hero](./hero.png)";
    expect(
      rewriteMarkdownAssetReferences({
        markdown,
        references: { "./hero.png": "hero" },
        assetUrls: {},
      })
    ).toBe(markdown);
  });

  test("rewrites only references captured for the current Markdown file", () => {
    const markdown = "![Local](./hero.png) ![Parent](../hero.png)";

    expect(
      rewriteMarkdownAssetReferences({
        markdown,
        references: { "./hero.png": "local-hero" },
        assetUrls: {
          "local-hero": "/assets/local-hero.png",
          "parent-hero": "/assets/parent-hero.png",
        },
      })
    ).toContain("![Parent](../hero.png)");
  });
});
