import { describe, expect, test } from "vitest";
import {
  createCanonicalAssetPath,
  normalizeAssetPathQueryValue,
} from "./asset-path";

describe("normalizeAssetPathQueryValue", () => {
  test.each([
    ["Tutorial posts/article.mdx", "Tutorial%20posts/article.mdx"],
    ["Folder #1?/100%.mdx", "Folder%20%231%3F/100%25.mdx"],
    ["Tutorial%20posts/article.mdx", "Tutorial%20posts/article.mdx"],
    ["Folder%2Fname/article.mdx", "Folder%2Fname/article.mdx"],
    ["100% ready/article.mdx", "100%25%20ready/article.mdx"],
    ["./../article.mdx", "%2E/%2E%2E/article.mdx"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(normalizeAssetPathQueryValue(input)).toBe(expected);
  });

  test("is idempotent for canonical paths", () => {
    const path = createCanonicalAssetPath({
      folderNames: ["Tutorial posts", "Folder/name", "%20"],
      name: "Article #1? & 100%.mdx",
    });

    expect(normalizeAssetPathQueryValue(path)).toBe(path);
  });
});
