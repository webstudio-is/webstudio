import { describe, expect, test, vi } from "vitest";
import {
  createAssetResourceIndex,
  serializeAssetResourceIndex,
} from "@webstudio-is/asset-resource";
import { loadAssetResourceIndexSnapshots } from "./resource-index-snapshot";

const createQuery = (result: unknown) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockResolvedValue({ data: result, error: null });
  return query;
};

describe("publication resource index snapshots", () => {
  test("reads and verifies each exact active immutable revision", async () => {
    const index = await createAssetResourceIndex({
      format: "webstudio-resource-index",
      version: 1,
      resourceId: "posts",
      query: "*[]",
      assetRevision: `sha256:${"a".repeat(64)}`,
      queryMode: "static",
      parameterNames: [],
      documents: [],
    });
    const states = createQuery([
      {
        resourceId: "posts",
        queryHash: index.queryHash,
        assetRevision: index.assetRevision,
        activeRevision: index.integrity.checksum,
        buildStatus: "ACTIVE",
        deletedAt: null,
      },
    ]);
    const revisions = createQuery([
      {
        resourceId: "posts",
        revision: index.integrity.checksum,
        queryHash: index.queryHash,
        assetRevision: index.assetRevision,
        objectKey: "private/posts.json",
      },
    ]);
    const client = {
      from: vi.fn().mockReturnValueOnce(states).mockReturnValueOnce(revisions),
    };
    const bytes = new TextEncoder().encode(serializeAssetResourceIndex(index));
    const read = vi.fn(async () => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield bytes;
        },
      },
    }));

    await expect(
      loadAssetResourceIndexSnapshots({
        client: client as never,
        projectId: "project-1",
        resources: [
          { resourceId: "posts", queryHash: index.queryHash },
          { resourceId: "posts", queryHash: index.queryHash },
        ],
        read,
        expectedAssetRevision: index.assetRevision,
      })
    ).resolves.toEqual([
      { resourceId: "posts", revision: index.integrity.checksum, index },
    ]);
    expect(read).toHaveBeenCalledWith("private/posts.json");
  });

  test("blocks missing, inactive, and inconsistent active revisions", async () => {
    const states = createQuery([]);
    const client = { from: vi.fn().mockReturnValue(states) };
    await expect(
      loadAssetResourceIndexSnapshots({
        client: client as never,
        projectId: "project-1",
        resources: [
          { resourceId: "posts", queryHash: `sha256:${"b".repeat(64)}` },
        ],
        read: vi.fn(),
        expectedAssetRevision: `sha256:${"a".repeat(64)}`,
      })
    ).rejects.toMatchObject({ resourceId: "posts" });
  });
});
