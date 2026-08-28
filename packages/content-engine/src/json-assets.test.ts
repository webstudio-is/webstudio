import { expect, test } from "vitest";
import { rewriteJsonAssetReferences } from "./json-assets";

test("rewrites scalar and structured JSON Asset references", async () => {
  const rewritten = await rewriteJsonAssetReferences({
    source: JSON.stringify({
      avatar: "../media/avatar.png#profile",
      organization: { $ref: "./organization.json#frontmatter" },
    }),
    sourcePath: "authors/oleg.json",
    assetPaths: new Map([
      ["avatar", "media/avatar.png"],
      ["organization", "authors/organization.json"],
    ]),
    replacementPaths: new Map([
      ["avatar", "avatar_1.png"],
      ["organization", "organization_1.json"],
    ]),
  });

  expect(JSON.parse(rewritten)).toEqual({
    avatar: "avatar_1.png#profile",
    organization: { $ref: "organization_1.json#frontmatter" },
  });
  expect(rewritten.endsWith("\n")).toBe(true);
});
