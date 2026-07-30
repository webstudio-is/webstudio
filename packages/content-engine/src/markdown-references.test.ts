import { describe, expect, test } from "vitest";
import { rewriteMarkdownAssetReferenceRanges } from "./markdown-references";

describe("Markdown asset reference ranges", () => {
  test("rewrites multiple destinations without shifting earlier ranges", () => {
    const markdown = "![One](one.png) ![Two](two.png)";
    const oneStart = markdown.indexOf("one.png");
    const twoStart = markdown.indexOf("two.png");

    expect(
      rewriteMarkdownAssetReferenceRanges({
        markdown,
        references: [
          { start: oneStart, end: oneStart + 7, assetId: "one" },
          {
            start: twoStart,
            end: twoStart + 7,
            assetId: "two",
            suffix: "#crop",
          },
        ],
        assetUrls: { one: "/assets/one.png", two: "/assets/two.png" },
      })
    ).toBe("![One](/assets/one.png) ![Two](/assets/two.png#crop)");
  });

  test("leaves a destination unchanged without a runtime URL", () => {
    expect(
      rewriteMarkdownAssetReferenceRanges({
        markdown: "![Hero](hero.png)",
        references: [{ start: 8, end: 16, assetId: "hero" }],
        assetUrls: {},
      })
    ).toBe("![Hero](hero.png)");
  });

  test("merges reference parameters with an asset URL query", () => {
    const markdown = "![Hero](hero.png?width=100#crop)";
    const start = markdown.indexOf("hero.png");

    expect(
      rewriteMarkdownAssetReferenceRanges({
        markdown,
        references: [
          {
            start,
            end: start + "hero.png?width=100#crop".length,
            assetId: "hero",
            suffix: "?width=100#crop",
          },
        ],
        assetUrls: { hero: "/cgi/image/hero.png?format=raw" },
      })
    ).toBe("![Hero](/cgi/image/hero.png?format=raw&width=100#crop)");
  });

  test("rejects overlapping or out-of-bounds ranges", () => {
    expect(() =>
      rewriteMarkdownAssetReferenceRanges({
        markdown: "012345",
        references: [
          { start: 1, end: 4, assetId: "one" },
          { start: 3, end: 5, assetId: "two" },
        ],
        assetUrls: {},
      })
    ).toThrow("Markdown asset reference range is invalid");
  });
});
