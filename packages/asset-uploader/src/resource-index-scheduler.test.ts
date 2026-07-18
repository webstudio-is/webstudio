import { afterEach, describe, expect, test, vi } from "vitest";
import type { Client } from "@webstudio-is/postgrest/index.server";
import { AssetResourceIndexBuildCancelledError } from "./resource-index-build";
import { AssetResourceIndexBuildScheduler } from "./resource-index-scheduler";

afterEach(() => vi.useRealTimers());

describe("resource index build scheduler", () => {
  test("debounces by project and resource and cancels the obsolete promise", async () => {
    vi.useFakeTimers();
    const rpc = vi.fn(async (name: string) => ({
      data: name === "activate_asset_resource_index" ? true : null,
      error: null,
    }));
    const putIfAbsent = vi.fn(async ({ checksum }) => ({
      status: "created" as const,
      checksum,
    }));
    const scheduler = new AssetResourceIndexBuildScheduler(100);
    const input = {
      client: { rpc } as unknown as Client,
      store: { putIfAbsent },
      projectId: "project-1",
      resourceId: "posts",
      loadEntries: async () => [],
    };

    const obsolete = scheduler.schedule({ ...input, query: "*[false]" });
    const current = scheduler.schedule({ ...input, query: "*[true]" });
    await expect(obsolete).rejects.toBeInstanceOf(
      AssetResourceIndexBuildCancelledError
    );
    await vi.advanceTimersByTimeAsync(100);
    await expect(current).resolves.toBeDefined();
    expect(putIfAbsent).toHaveBeenCalledOnce();
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "begin_asset_resource_index_build",
      "activate_asset_resource_index",
    ]);
  });

  test("rejects invalid edits immediately without scheduling work", () => {
    const scheduler = new AssetResourceIndexBuildScheduler(100);
    expect(() =>
      scheduler.schedule({
        client: {} as Client,
        store: { putIfAbsent: vi.fn() },
        projectId: "project-1",
        resourceId: "posts",
        query: "*[invalid ==",
        loadEntries: vi.fn(),
      })
    ).toThrow();
  });
});
