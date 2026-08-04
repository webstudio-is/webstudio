import { describe, expect, test, vi } from "vitest";
import {
  previewProjectAssetQueries,
  previewProjectAssetQuery,
} from "./asset-query-preview.server";

describe("project asset query preview Builder binding", () => {
  test("stops cancelled previews before creating Builder dependencies", async () => {
    const controller = new AbortController();
    controller.abort();
    const createAssetClient = vi.fn(() => ({}) as never);
    const getContentDatabaseMaxBytes = vi.fn(() => 42);
    const previewProjectAssetQueriesDependency = vi.fn(
      ({ signal }: { signal?: AbortSignal }) => signal?.throwIfAborted()
    );
    const previewProjectAssetQueryDependency = vi.fn(
      ({ signal }: { signal?: AbortSignal }) => signal?.throwIfAborted()
    );

    await expect(
      previewProjectAssetQueries(
        {
          projectId: "project-1",
          requests: [],
          context: {} as never,
          signal: controller.signal,
        },
        {
          createAssetClient,
          getContentDatabaseMaxBytes,
          previewProjectAssetQueries:
            previewProjectAssetQueriesDependency as never,
        }
      )
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      previewProjectAssetQuery(
        {
          projectId: "project-1",
          request: { query: {} },
          context: {} as never,
          signal: controller.signal,
        },
        {
          createAssetClient,
          getContentDatabaseMaxBytes,
          previewProjectAssetQuery: previewProjectAssetQueryDependency as never,
        }
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(createAssetClient).not.toHaveBeenCalled();
    expect(getContentDatabaseMaxBytes).not.toHaveBeenCalled();
    expect(previewProjectAssetQueriesDependency).not.toHaveBeenCalled();
    expect(previewProjectAssetQueryDependency).not.toHaveBeenCalled();
  });

  test("binds Builder storage configuration to a shared batch preview", async () => {
    const assetClient = { readFile: vi.fn() } as never;
    const result = [{ status: "fulfilled", value: {} }] as never;
    const dependencies = {
      createAssetClient: vi.fn(() => assetClient),
      getContentDatabaseMaxBytes: vi.fn(() => 42),
      previewProjectAssetQueries: vi.fn().mockResolvedValue(result),
    };
    const args = {
      projectId: "project-1",
      requests: [{ query: { limit: 1 } }],
      context: {} as never,
      signal: new AbortController().signal,
    };

    await expect(previewProjectAssetQueries(args, dependencies)).resolves.toBe(
      result
    );

    expect(dependencies.previewProjectAssetQueries).toHaveBeenCalledWith({
      ...args,
      assetClient,
      contentDatabaseMaxBytes: 42,
    });
  });

  test("binds Builder storage configuration to a shared diagnostics preview", async () => {
    const assetClient = { readFile: vi.fn() } as never;
    const result = { data: { items: [] } } as never;
    const dependencies = {
      createAssetClient: vi.fn(() => assetClient),
      getContentDatabaseMaxBytes: vi.fn(() => 42),
      previewProjectAssetQuery: vi.fn().mockResolvedValue(result),
    };
    const args = {
      projectId: "project-1",
      request: { query: { limit: 1 } },
      context: {} as never,
      includeDiagnostics: true,
      includeUnresolvedDiagnostics: true,
    };

    await expect(previewProjectAssetQuery(args, dependencies)).resolves.toBe(
      result
    );

    expect(dependencies.previewProjectAssetQuery).toHaveBeenCalledWith({
      ...args,
      assetClient,
      contentDatabaseMaxBytes: 42,
    });
  });
});
