import { describe, expect, test, vi } from "vitest";
import type { AssetResourceIndexV1 } from "@webstudio-is/sdk";
import {
  getAssetResourceIndexObjectKey,
  persistAssetResourceIndex,
  type ImmutableAssetResourceIndexStore,
} from "./index-storage";
import { createAssetResourceIndex } from "./resource-index";

const createIndex = () =>
  createAssetResourceIndex({
    format: "webstudio-resource-index",
    version: 1,
    resourceId: "blog/posts",
    query: "*[]",
    assetRevision: `sha256:${"b".repeat(64)}`,
    queryMode: "static",
    parameterNames: [],
    documents: [],
  });

describe("resource index persistence", () => {
  test("writes deterministic bytes once under an escaped private object key", async () => {
    const putIfAbsent = vi.fn<ImmutableAssetResourceIndexStore["putIfAbsent"]>(
      async ({ checksum }) => ({ status: "created", checksum })
    );
    const index = await createIndex();
    const result = await persistAssetResourceIndex({
      store: { putIfAbsent },
      projectId: "project/../private",
      index,
    });

    expect(result.key).toMatch(/^resource-indexes\//);
    expect(result).toEqual({
      key: getAssetResourceIndexObjectKey({
        projectId: "project/../private",
        index,
      }),
      revision: index.integrity.checksum,
      status: "created",
    });
    expect(result.key).toContain("project%2F%2E%2E%2Fprivate");
    expect(result.key).toContain(encodeURIComponent(index.assetRevision));
    expect(result.key).toContain(
      `${encodeURIComponent(index.integrity.checksum)}.json`
    );
    expect(putIfAbsent).toHaveBeenCalledWith(
      expect.objectContaining({
        key: result.key,
        contentType: "application/json",
        checksum: index.integrity.checksum,
        data: expect.any(Uint8Array),
      })
    );
  });

  test("accepts an idempotent existing object and rejects a collision", async () => {
    const index = await createIndex();
    const persist = (checksum: string) =>
      persistAssetResourceIndex({
        store: {
          putIfAbsent: async () => ({ status: "exists", checksum }),
        },
        projectId: "project-1",
        index,
      });

    await expect(persist(index.integrity.checksum)).resolves.toMatchObject({
      status: "exists",
    });
    await expect(persist(`sha256:${"f".repeat(64)}`)).rejects.toThrow(
      "already has other bytes"
    );
  });

  test("verifies artifact integrity before touching storage", async () => {
    const putIfAbsent = vi.fn();
    const index = await createIndex();
    await expect(
      persistAssetResourceIndex({
        store: { putIfAbsent },
        projectId: "project-1",
        index: {
          ...index,
          documents: [{ unexpected: true }],
        } as unknown as AssetResourceIndexV1,
      })
    ).rejects.toThrow();
    expect(putIfAbsent).not.toHaveBeenCalled();
  });
});
