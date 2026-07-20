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
    const rpc = vi.fn(async (name: string, _parameters?: unknown) => ({
      data: name === "remove_asset_resource_index_reference" ? 1 : null,
      error: null,
    }));
    const client = {
      from: vi.fn().mockReturnValueOnce(states).mockReturnValueOnce(revisions),
      rpc,
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
        referenceId: "build-1",
        garbageCollectionStore: { delete: async () => "deleted" },
        expectedAssetRevision: index.assetRevision,
      })
    ).resolves.toEqual([
      { resourceId: "posts", revision: index.integrity.checksum, index },
    ]);
    expect(read).toHaveBeenCalledWith("private/posts.json");
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "add_asset_resource_index_reference",
      "remove_asset_resource_index_reference",
      "claim_asset_resource_index_garbage",
    ]);
    const addReference = rpc.mock.calls[0][1] as { p_reference_id: string };
    const removeReference = rpc.mock.calls[1][1] as { p_reference_id: string };
    expect(addReference.p_reference_id).toBe(removeReference.p_reference_id);
    expect(addReference.p_reference_id).toMatch(/^build-1:/);
    expect(addReference.p_reference_id).not.toBe("build-1");
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
        referenceId: "build-1",
        expectedAssetRevision: `sha256:${"a".repeat(64)}`,
      })
    ).rejects.toMatchObject({ resourceId: "posts" });
  });
});
