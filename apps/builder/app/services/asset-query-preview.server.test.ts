import { describe, expect, test, vi } from "vitest";
import { createStructuredAssetQueryResourceBody } from "@webstudio-is/sdk";
import {
  previewProjectAssetQueries,
  previewProjectAssetQuery,
} from "./asset-query-preview.server";

describe("project asset query preview", () => {
  test("previews an ordinary Assets batch from lightweight build data", async () => {
    const context = {} as never;
    const assetClient = { readFile: vi.fn(), uploadFile: vi.fn() } as never;
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
      createAssetClient: vi.fn(() => assetClient),
      loadDevBuildContentCompilationDataByProjectId: vi
        .fn()
        .mockResolvedValue(build),
      previewAssetResourceQueries: vi.fn().mockResolvedValue(result),
    };

    await expect(
      previewProjectAssetQueries(
        {
          projectId: "project-1",
          requests,
          context,
          signal: new AbortController().signal,
        },
        dependencies
      )
    ).resolves.toBe(result);

    expect(
      dependencies.loadDevBuildContentCompilationDataByProjectId
    ).toHaveBeenCalledWith(context, "project-1", expect.any(AbortSignal));
    expect(dependencies.createAssetClient).toHaveBeenCalledOnce();
    expect(dependencies.previewAssetResourceQueries).toHaveBeenCalledWith({
      projectId: "project-1",
      requests,
      context,
      assetClient,
      contentDatabaseMaxBytes: 512_000,
      databasePlan: expect.objectContaining({
        queries: [expect.objectContaining({ id: "posts-resource" })],
      }),
      signal: expect.any(AbortSignal),
    });
  });

  test("stops a cancelled Assets batch before loading Build data", async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = {
      createAssetClient: vi.fn(() => ({}) as never),
      loadDevBuildContentCompilationDataByProjectId: vi
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
          signal: controller.signal,
        },
        dependencies
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(
      dependencies.loadDevBuildContentCompilationDataByProjectId
    ).not.toHaveBeenCalled();
    expect(dependencies.previewAssetResourceQueries).not.toHaveBeenCalled();
  });

  test("previews against the current build content database plan", async () => {
    const context = {} as never;
    const build = {
      props: [],
      dataSources: [],
      resources: [],
    } as never;
    const assetClient = { readFile: vi.fn(), uploadFile: vi.fn() } as never;
    const result = { data: { items: [] } } as never;
    const dependencies = {
      createAssetClient: vi.fn(() => assetClient),
      loadDevBuildByProjectId: vi.fn().mockResolvedValue(build),
      previewAssetResourceQuery: vi.fn().mockResolvedValue(result),
    };

    await expect(
      previewProjectAssetQuery(
        {
          projectId: "project-1",
          request: { query: { limit: 5 } },
          context,
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
      contentDatabaseMaxBytes: 512_000,
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

  test("stops a cancelled diagnostics query before loading the full Build", async () => {
    const controller = new AbortController();
    controller.abort();
    const dependencies = {
      createAssetClient: vi.fn(() => ({}) as never),
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
          signal: controller.signal,
        },
        dependencies
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(dependencies.loadDevBuildByProjectId).not.toHaveBeenCalled();
    expect(dependencies.previewAssetResourceQuery).not.toHaveBeenCalled();
  });

  test("includes unresolved diagnostics only when requested", async () => {
    const context = {} as never;
    const build = { props: [], dataSources: [], resources: [] } as never;
    const previewAssetResourceQuery = vi.fn().mockResolvedValue({});

    await previewProjectAssetQuery(
      {
        projectId: "project-1",
        request: { query: { limit: 1 } },
        context,
        includeUnresolvedDiagnostics: true,
      },
      {
        createAssetClient: vi.fn(() => ({}) as never),
        loadDevBuildByProjectId: vi.fn().mockResolvedValue(build),
        previewAssetResourceQuery,
      }
    );

    expect(previewAssetResourceQuery).toHaveBeenCalledWith(
      expect.objectContaining({ includeUnresolvedDiagnostics: true })
    );
  });
});
