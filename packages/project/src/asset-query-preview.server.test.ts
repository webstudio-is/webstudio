import { describe, expect, test, vi } from "vitest";
import { createStructuredAssetQueryResourceBody } from "@webstudio-is/sdk";
import {
  previewProjectAssetQueries,
  previewProjectAssetQuery,
} from "./asset-query-preview.server";

describe("project asset query preview", () => {
  test("previews an Assets batch from content-engine Build data", async () => {
    const context = {} as never;
    const assetClient = { readFile: vi.fn() } as never;
    const requests = [
      {
        query: {
          where: {
            field: ["properties", "category"],
            operator: "eq",
            value: "Tools",
          },
        },
      },
      {
        query: {
          where: {
            field: ["properties", "category"],
            operator: "eq",
            value: "Strategy",
          },
        },
      },
    ] as never;
    const build = {
      props: [
        {
          id: "posts-prop",
          instanceId: "collection",
          name: "posts",
          type: "resource",
          value: "posts-resource",
        },
      ],
      dataSources: [],
      resources: [
        {
          id: "posts-resource",
          name: "Posts",
          control: "system",
          method: "post",
          url: '"/$resources/assets"',
          headers: [],
          body: createStructuredAssetQueryResourceBody({
            where: { all: [] },
            sort: [],
            limit: "50",
            offset: "0",
            output: { mode: "base", includeMetadata: true },
            content: { mode: "none" },
          }),
        },
      ],
    } as never;
    const result = [
      { status: "fulfilled", value: { data: { items: [] } } },
      { status: "fulfilled", value: { data: { items: [] } } },
    ] as never;
    const dependencies = {
      loadDevBuildContentEngineDataByProjectId: vi
        .fn()
        .mockResolvedValue(build),
      previewAssetResourceQueries: vi.fn().mockResolvedValue(result),
    };
    const signal = new AbortController().signal;
    const performanceEvents: unknown[] = [];
    const onPerformanceEvent = (event: unknown) =>
      performanceEvents.push(event);

    await expect(
      previewProjectAssetQueries(
        {
          projectId: "project-1",
          requests,
          context,
          assetClient,
          contentDatabaseMaxBytes: 42,
          signal,
          onPerformanceEvent,
        },
        dependencies
      )
    ).resolves.toBe(result);

    expect(
      dependencies.loadDevBuildContentEngineDataByProjectId
    ).toHaveBeenCalledWith(context, "project-1", signal);
    expect(dependencies.previewAssetResourceQueries).toHaveBeenCalledWith({
      projectId: "project-1",
      requests,
      context,
      assetClient,
      contentDatabaseMaxBytes: 42,
      databasePlan: expect.objectContaining({
        queries: [expect.objectContaining({ id: "posts-resource" })],
      }),
      signal,
      onPerformanceEvent,
    });
    expect(performanceEvents).toEqual([
      expect.objectContaining({
        type: "phase-completed",
        phase: "build-plan",
        durationMs: expect.any(Number),
      }),
    ]);
  });

  test("stops a cancelled batch before loading Build data", async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = {
      loadDevBuildContentEngineDataByProjectId: vi
        .fn()
        .mockResolvedValue({ props: [], dataSources: [], resources: [] }),
      previewAssetResourceQueries: vi.fn().mockResolvedValue([]),
    };

    await expect(
      previewProjectAssetQueries(
        {
          projectId: "project-1",
          requests: [],
          context: {} as never,
          assetClient: {} as never,
          signal: controller.signal,
        },
        dependencies
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(
      dependencies.loadDevBuildContentEngineDataByProjectId
    ).not.toHaveBeenCalled();
    expect(dependencies.previewAssetResourceQueries).not.toHaveBeenCalled();
  });

  test("previews a query against the current Build database plan", async () => {
    const context = {} as never;
    const build = { props: [], dataSources: [], resources: [] } as never;
    const assetClient = { readFile: vi.fn() } as never;
    const result = { data: { items: [] } } as never;
    const dependencies = {
      loadDevBuildByProjectId: vi.fn().mockResolvedValue(build),
      previewAssetResourceQuery: vi.fn().mockResolvedValue(result),
    };

    await expect(
      previewProjectAssetQuery(
        {
          projectId: "project-1",
          request: { query: { limit: 5 } },
          context,
          assetClient,
          contentDatabaseMaxBytes: 42,
        },
        dependencies
      )
    ).resolves.toBe(result);

    expect(dependencies.loadDevBuildByProjectId).toHaveBeenCalledWith(
      context,
      "project-1",
      undefined
    );
    expect(dependencies.previewAssetResourceQuery).toHaveBeenCalledWith({
      projectId: "project-1",
      request: { query: { limit: 5 } },
      context,
      assetClient,
      contentDatabaseMaxBytes: 42,
      databasePlan: undefined,
      diagnosticsPlan: expect.objectContaining({
        queries: expect.arrayContaining([
          expect.objectContaining({
            id: "__query-preview__",
            limit: { type: "literal", value: 5 },
          }),
        ]),
      }),
    });
  });

  test("stops a cancelled query before loading the full Build", async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = {
      loadDevBuildByProjectId: vi
        .fn()
        .mockResolvedValue({ props: [], dataSources: [], resources: [] }),
      previewAssetResourceQuery: vi.fn().mockResolvedValue({}),
    };

    await expect(
      previewProjectAssetQuery(
        {
          projectId: "project-1",
          request: { query: {} },
          context: {} as never,
          assetClient: {} as never,
          signal: controller.signal,
        },
        dependencies
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(dependencies.loadDevBuildByProjectId).not.toHaveBeenCalled();
    expect(dependencies.previewAssetResourceQuery).not.toHaveBeenCalled();
  });

  test("forwards query diagnostics options", async () => {
    const previewAssetResourceQuery = vi.fn().mockResolvedValue({});

    await previewProjectAssetQuery(
      {
        projectId: "project-1",
        request: { query: { limit: 1 } },
        context: {} as never,
        assetClient: {} as never,
        includeDiagnostics: false,
        includeUnresolvedDiagnostics: true,
      },
      {
        loadDevBuildByProjectId: vi
          .fn()
          .mockResolvedValue({ props: [], dataSources: [], resources: [] }),
        previewAssetResourceQuery,
      }
    );

    expect(previewAssetResourceQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        includeDiagnostics: false,
        includeUnresolvedDiagnostics: true,
      })
    );
    expect(previewAssetResourceQuery.mock.calls[0][0]).not.toHaveProperty(
      "diagnosticsPlan"
    );
  });
});
