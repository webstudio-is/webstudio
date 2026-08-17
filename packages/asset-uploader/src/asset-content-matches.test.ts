import { expect, test } from "vitest";
import type { Asset } from "@webstudio-is/sdk";
import {
  searchAssetContentMatches,
  updateAssetContentMatches,
} from "./asset-content-matches";

const asset = {
  id: "article",
  projectId: "project",
  name: "article.md",
  size: 20,
  type: "file",
  format: "md",
  createdAt: "2026-01-01T00:00:00.000Z",
  description: null,
  meta: {},
} satisfies Asset;

const createRepository = (initialContent = "# Old title\n\nOld body") => {
  let content = initialContent;
  return {
    repository: {
      list: async () => [asset],
      readContent: async () => ({
        asset,
        data: (async function* () {
          yield new TextEncoder().encode(content);
        })(),
      }),
      updateContent: async ({ data }: { data: ReadableStream<Uint8Array> }) => {
        content = await new Response(data).text();
        return asset;
      },
    },
    getContent: () => content,
  };
};

test("searches document content without returning the complete document", async () => {
  const { repository } = createRepository();
  const result = await searchAssetContentMatches({
    repository,
    query: "Old",
  });

  expect(result.matches).toHaveLength(2);
  expect(result.matches[0]).toMatchObject({
    entityId: "article",
    currentValue: "Old",
    editCommand: "update-document-matches",
    location: { source: "article.md", line: 1, column: 3 },
  });
  expect(JSON.stringify(result)).not.toContain("Old body");
});

test("updates several matches in one document revision", async () => {
  const { repository, getContent } = createRepository();
  const { matches } = await searchAssetContentMatches({
    repository,
    query: "Old",
  });
  await updateAssetContentMatches({
    repository,
    updates: matches.map((match) => ({
      matchId: String(match.matchId),
      expectedValue: "Old",
      value: "New",
    })),
  });

  expect(getContent()).toBe("# New title\n\nNew body");
});

test("rejects stale document matches before writing", async () => {
  const { repository } = createRepository("Changed");
  await expect(
    updateAssetContentMatches({
      repository,
      updates: [
        {
          matchId: "document-match:%5B%22article%22%2C0%2C0%5D",
          expectedValue: "Old",
          value: "New",
        },
      ],
    })
  ).rejects.toThrow(/changed since search/i);
});
