import { describe, expect, test } from "vitest";
import { discoverMarkdownAssetReferenceRanges } from "./markdown-assets";
import { rewriteMarkdownAssetReferenceRanges } from "./markdown-references";

const discoverReferences = (input: {
  markdown: string;
  sourcePath: string;
  assetIdsByPath: ReadonlyMap<string, string>;
}) =>
  Object.fromEntries(
    discoverMarkdownAssetReferenceRanges(input).map(
      ({ start, end, assetId }) => [input.markdown.slice(start, end), assetId]
    )
  );

const rewriteDiscoveredReferences = ({
  markdown,
  sourcePath = "blog/post.md",
  assetIdsByPath,
  assetUrls,
}: {
  markdown: string;
  sourcePath?: string;
  assetIdsByPath: ReadonlyMap<string, string>;
  assetUrls: Readonly<Record<string, string>>;
}) =>
  rewriteMarkdownAssetReferenceRanges({
    markdown,
    references: discoverMarkdownAssetReferenceRanges({
      markdown,
      sourcePath,
      assetIdsByPath,
    }),
    assetUrls,
  });

describe("Markdown asset references", () => {
  test("resolves conventional references against the Markdown file's folder", () => {
    const references = discoverReferences({
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
        ["blog/images/hero%20image.png", "hero"],
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
    const references = discoverReferences({
      sourcePath: "blog/post.md",
      markdown: `
[Absolute](https://example.com/file.pdf)
[Protocol relative](//example.com/file.pdf)
[Root relative](/images/hero.png)
[Email](mailto:hello@example.com)
[Fragment](#section)
[Query](?preview=true)
[Malformed](./images/hero%2Fimage.png)
      `,
      assetIdsByPath: new Map([
        ["blog/images/hero/image.png", "encoded-slash"],
        ["images/hero.png", "root-relative"],
      ]),
    });

    expect(references).toEqual({});
  });

  test("resolves canonical encoded asset paths", () => {
    expect(
      discoverReferences({
        sourcePath: "blog/special%20%23%20%3F%20%25/post.md",
        markdown:
          "![Hero](./hero%20%23%20%3F%20%25.png)\n![Unicode](./Ol%C3%A1.png)",
        assetIdsByPath: new Map([
          ["blog/special%20%23%20%3F%20%25/hero%20%23%20%3F%20%25.png", "hero"],
          ["blog/special%20%23%20%3F%20%25/Ol%C3%A1.png", "unicode"],
        ]),
      })
    ).toEqual({
      "./hero%20%23%20%3F%20%25.png": "hero",
      "./Ol%C3%A1.png": "unicode",
    });
  });

  test("preserves encoded dot segments in canonical source folders", () => {
    expect(
      discoverReferences({
        sourcePath: "%2E/%2E%2E/post.md",
        markdown: "![Hero](./hero.png)",
        assetIdsByPath: new Map([["%2E/%2E%2E/hero.png", "hero"]]),
      })
    ).toEqual({ "./hero.png": "hero" });
  });

  test("resolves asset IDs inserted by the Builder", () => {
    expect(
      discoverReferences({
        sourcePath: "blog/post.md",
        markdown: "![Hero](image-id)",
        assetIdsByPath: new Map([["images/hero.png", "image-id"]]),
      })
    ).toEqual({ "image-id": "image-id" });
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
    const result = rewriteDiscoveredReferences({
      markdown,
      assetIdsByPath: new Map([
        ["images/hero.png", "hero"],
        ["blog/guide.pdf", "guide"],
        ["blog/table.png", "table"],
      ]),
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
    expect(result).toContain("[Download][guide]");
  });

  test("preserves Markdown formatting and decodes destination syntax", () => {
    const markdown =
      'Prefix 😀 [Download](<./guide&amp;notes.pdf>  "Title") suffix';

    expect(
      rewriteDiscoveredReferences({
        markdown,
        assetIdsByPath: new Map([["blog/guide%26notes.pdf", "guide"]]),
        assetUrls: { guide: "/assets/guide.pdf" },
      })
    ).toBe('Prefix 😀 [Download](</assets/guide.pdf>  "Title") suffix');
  });

  test("records body-relative destination ranges for parser-free runtime rewriting", () => {
    const markdown = "😀 ![Hero](../hero.png?size=2#crop)";

    expect(
      discoverMarkdownAssetReferenceRanges({
        markdown,
        sourcePath: "blog/post.md",
        assetIdsByPath: new Map([["hero.png", "hero"]]),
      })
    ).toEqual([
      {
        start: markdown.indexOf("../hero.png"),
        end: markdown.indexOf("../hero.png") + "../hero.png?size=2#crop".length,
        assetId: "hero",
        suffix: "?size=2#crop",
      },
    ]);
  });

  test("leaves Markdown unchanged when no runtime URL is available", () => {
    const markdown = "![Hero](./hero.png)";
    expect(
      rewriteDiscoveredReferences({
        markdown,
        assetIdsByPath: new Map([["blog/hero.png", "hero"]]),
        assetUrls: {},
      })
    ).toBe(markdown);
  });

  test("rewrites only references captured for the current Markdown file", () => {
    const markdown =
      "![Local](./hero.png) ![Parent](../hero.png) `./hero.png` and ./hero.png";

    const result = rewriteDiscoveredReferences({
      markdown,
      assetIdsByPath: new Map([["blog/hero.png", "local-hero"]]),
      assetUrls: {
        "local-hero": "/assets/local-hero.png",
        "parent-hero": "/assets/parent-hero.png",
      },
    });

    expect(result).toContain("![Parent](../hero.png)");
    expect(result).toContain("`./hero.png` and ./hero.png");
  });
});
