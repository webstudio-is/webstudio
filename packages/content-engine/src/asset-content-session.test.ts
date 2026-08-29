import { describe, expect, test, vi } from "vitest";
import type {
  AssetContentDescriptor,
  AssetContentRepository,
} from "./asset-content-repository";
import { AssetRevisionConflictError } from "./asset-content-repository";
import { createAssetContentSession } from "./asset-content-session";

const descriptor = (name = "article_v1.mdx"): AssetContentDescriptor => ({
  id: "asset",
  projectId: "project",
  name,
  type: "file",
  format: "mdx",
  size: 7,
  createdAt: "2026-01-01T00:00:00.000Z",
});

describe("Asset content session", () => {
  test("deduplicates concurrent loads for one Asset", async () => {
    let resolveRead!: (
      value: Awaited<ReturnType<AssetContentRepository["readContent"]>>
    ) => void;
    const readContent = vi.fn(
      () =>
        new Promise<Awaited<ReturnType<AssetContentRepository["readContent"]>>>(
          (resolve) => {
            resolveRead = resolve;
          }
        )
    );
    const session = createAssetContentSession({
      repository: {
        readContent,
        updateContent: vi.fn(),
      },
      authorize: async () => true,
      debounceMilliseconds: 0,
    });

    const first = session.open("asset");
    const second = session.open("asset");
    await vi.waitFor(() => expect(readContent).toHaveBeenCalledOnce());
    resolveRead({
      asset: descriptor(),
      data: (async function* () {
        yield new TextEncoder().encode("Initial");
      })(),
    });

    await expect(first).resolves.toMatchObject({ source: "Initial" });
    await expect(second).resolves.toMatchObject({ source: "Initial" });
    expect(readContent).toHaveBeenCalledOnce();
  });

  test("coalesces rapid edits and prepares the next write from the latest local source", async () => {
    const writes: string[] = [];
    let releaseFirst!: () => void;
    const repository: AssetContentRepository = {
      readContent: async () => ({
        asset: descriptor(),
        data: (async function* () {
          yield new TextEncoder().encode("Initial");
        })(),
      }),
      updateContent: async ({ data }) => {
        const source = await new Response(data).text();
        writes.push(source);
        if (writes.length === 1) {
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
        }
        return descriptor(`article_v${writes.length + 1}.mdx`);
      },
    };
    const session = createAssetContentSession({
      repository,
      authorize: async () => true,
      debounceMilliseconds: 0,
    });
    await session.open("asset");

    session.save("asset", "First");
    const flushing = session.flush("asset");
    await vi.waitFor(() => expect(writes).toEqual(["First"]));
    session.save("asset", "Latest");
    releaseFirst();
    await flushing;

    expect(writes).toEqual(["First", "Latest"]);
    expect(session.get("asset")).toMatchObject({
      status: "saved",
      source: "Latest",
    });
  });

  test("keeps failed local content retryable", async () => {
    let shouldFail = true;
    const repository: AssetContentRepository = {
      readContent: async () => ({
        asset: descriptor(),
        data: (async function* () {
          yield new TextEncoder().encode("Initial");
        })(),
      }),
      updateContent: async () => {
        if (shouldFail) {
          throw new Error("Temporary failure");
        }
        return descriptor("article_v2.mdx");
      },
    };
    const session = createAssetContentSession({
      repository,
      authorize: async () => true,
      debounceMilliseconds: 0,
    });
    await session.open("asset");
    session.save("asset", "Local");
    await expect(session.flush("asset")).rejects.toThrow("Temporary failure");
    expect(session.get("asset")).toMatchObject({
      status: "failed",
      source: "Local",
    });

    shouldFail = false;
    await session.retry("asset");
    expect(session.get("asset")).toMatchObject({
      status: "saved",
      source: "Local",
    });
  });

  test("flushes every accepted pending write before session teardown", async () => {
    const writes: string[] = [];
    const session = createAssetContentSession({
      repository: {
        readContent: async ({ assetId }) => ({
          asset: { ...descriptor(`${assetId}_v1.mdx`), id: assetId },
          data: (async function* () {
            yield new TextEncoder().encode("Initial");
          })(),
        }),
        updateContent: async ({ assetId, data }) => {
          writes.push(`${assetId}:${await new Response(data).text()}`);
          return { ...descriptor(`${assetId}_v2.mdx`), id: assetId };
        },
      },
      authorize: () => true,
      schedule: () => Symbol(),
      cancelScheduled: () => {},
    });
    await Promise.all([session.open("first"), session.open("second")]);
    session.save("first", "First draft");
    session.save("second", "Second draft");

    await session.flushAll();
    session.dispose();

    expect(writes.sort()).toEqual(["first:First draft", "second:Second draft"]);
  });

  test("preserves local content and enters conflict state on an external revision", async () => {
    const repository: AssetContentRepository = {
      readContent: async () => ({
        asset: descriptor(),
        data: (async function* () {
          yield new TextEncoder().encode("Initial");
        })(),
      }),
      updateContent: async () => {
        throw new AssetRevisionConflictError("Conflict");
      },
    };
    const session = createAssetContentSession({
      repository,
      authorize: async () => true,
      debounceMilliseconds: 0,
    });
    await session.open("asset");
    session.save("asset", "Local");
    await expect(session.flush("asset")).rejects.toThrow("Conflict");
    expect(session.get("asset")).toMatchObject({
      status: "conflicting",
      source: "Local",
    });
  });

  test("reload revalidates the exact revision before a confirmed operation", async () => {
    let current = descriptor();
    const session = createAssetContentSession({
      repository: {
        readContent: async () => ({
          asset: current,
          data: (async function* () {
            yield new TextEncoder().encode("Initial");
          })(),
        }),
        updateContent: async () => current,
      },
      authorize: () => true,
    });
    await session.open("asset");
    current = descriptor("article_v2.mdx");

    await expect(
      session.reload("asset", { expectedName: "article_v1.mdx" })
    ).rejects.toThrow(AssetRevisionConflictError);
    expect(session.get("asset")).toMatchObject({
      asset: { name: "article_v1.mdx" },
      source: "Initial",
    });
  });

  test("reload does not overwrite edits made while its read is in flight", async () => {
    let readCount = 0;
    let resolveReload!: (
      value: Awaited<ReturnType<AssetContentRepository["readContent"]>>
    ) => void;
    const session = createAssetContentSession({
      repository: {
        readContent: async () => {
          readCount += 1;
          if (readCount === 1) {
            return {
              asset: descriptor(),
              data: (async function* () {
                yield new TextEncoder().encode("Initial");
              })(),
            };
          }
          return new Promise((resolve) => {
            resolveReload = resolve;
          });
        },
        updateContent: async () => descriptor(),
      },
      authorize: () => true,
      schedule: () => Symbol(),
      cancelScheduled: () => {},
    });
    await session.open("asset");

    const reloading = session.reload("asset");
    await vi.waitFor(() => expect(readCount).toBe(2));
    session.save("asset", "Local");
    resolveReload({
      asset: { ...descriptor("article_v2.mdx"), size: 6 },
      data: (async function* () {
        yield new TextEncoder().encode("Remote");
      })(),
    });

    await expect(reloading).rejects.toThrow(
      "Asset content session has unsaved changes"
    );
    expect(session.get("asset")).toMatchObject({
      status: "pending",
      source: "Local",
    });
  });
});
