import { describe, expect, test } from "vitest";
import { extractMarkdownFrontmatter } from "./markdown";
import { createScaleMarkdownFixture } from "./scale-fixture";

describe("1,000-file Markdown scale fixture", () => {
  test("provides deterministic nested, optional, array, and mixed-type frontmatter", async () => {
    const files = createScaleMarkdownFixture();
    expect(files).toHaveLength(1000);
    expect(new Set(files.map(({ id }) => id)).size).toBe(1000);
    const first = await extractMarkdownFrontmatter(files[0].source);
    const second = await extractMarkdownFrontmatter(files[1].source);
    expect(first.properties).toMatchObject({
      slug: "post-0000",
      author: { name: "Author 0" },
      tags: ["tag-0", "group-0"],
      series: { name: "Series 0", position: 0 },
      rating: 0,
    });
    expect(second.properties).toMatchObject({ rating: "1" });
    expect(second.properties).not.toHaveProperty("series");
  });
});
