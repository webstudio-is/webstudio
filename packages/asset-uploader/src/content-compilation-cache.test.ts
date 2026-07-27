import { describe, expect, test, vi } from "vitest";
import type { ContentArtifactV1 } from "@webstudio-is/content-engine";
import { createAssetIndex } from "@webstudio-is/content-engine/compiler";
import {
  createContentCompilationCache,
  createContentCompilationCacheKey,
  getContentDatabaseForArtifact,
} from "./content-compilation-cache";

const artifact = (revision: string) =>
  ({ integrity: { checksum: revision } }) as ContentArtifactV1;

describe("content compilation cache", () => {
  test("coalesces concurrent compilation for the same normalized key", async () => {
    const cache = createContentCompilationCache();
    const key = createContentCompilationCacheKey({
      projectId: "project",
      sourceRevision: "source",
      strict: false,
      maxBytes: 500,
    });
    const create = vi.fn(async () => artifact("compiled"));

    const [first, second] = await Promise.all([
      cache.getOrCreate(key, create),
      cache.getOrCreate(key, create),
    ]);

    expect(first).toBe(second);
    expect(create).toHaveBeenCalledOnce();
  });

  test("removes rejected work so a later request can retry", async () => {
    const cache = createContentCompilationCache();
    const create = vi
      .fn<() => Promise<ContentArtifactV1>>()
      .mockRejectedValueOnce(new Error("failed"))
      .mockResolvedValueOnce(artifact("retried"));

    await expect(cache.getOrCreate("key", create)).rejects.toThrow("failed");
    await expect(cache.getOrCreate("key", create)).resolves.toMatchObject({
      integrity: { checksum: "retried" },
    });
    expect(create).toHaveBeenCalledTimes(2);
  });

  test("evicts the least recently used completed entry", async () => {
    const cache = createContentCompilationCache(2);
    await cache.getOrCreate("first", async () => artifact("first"));
    await cache.getOrCreate("second", async () => artifact("second"));
    await cache.getOrCreate("first", async () => artifact("unused"));
    await cache.getOrCreate("third", async () => artifact("third"));
    const recreate = vi.fn(async () => artifact("second-again"));

    await cache.getOrCreate("second", recreate);

    expect(recreate).toHaveBeenCalledOnce();
    expect(cache.size).toBe(2);
  });

  test("reuses a storage-neutral database for one immutable artifact", async () => {
    const compiled = await createAssetIndex({
      projectId: "project",
      entries: [],
    });
    const equivalent = await createAssetIndex({
      projectId: "project",
      entries: [],
    });

    expect(getContentDatabaseForArtifact(compiled)).toBe(
      getContentDatabaseForArtifact(compiled)
    );
    expect(getContentDatabaseForArtifact(equivalent)).not.toBe(
      getContentDatabaseForArtifact(compiled)
    );
  });
});
