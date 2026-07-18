import { beforeEach, describe, expect, test, vi } from "vitest";

const patchLoadedBuild = vi.hoisted(() => vi.fn());
const authorizePatchEntries = vi.hoisted(() => vi.fn());
const createContentModeCapabilities = vi.hoisted(() =>
  vi.fn(() => ({ capabilities: true }))
);
const synchronizeAssetResourceIndexQueries = vi.hoisted(() => vi.fn());
const synchronizeAllCanonicalAssetStandardMetadata = vi.hoisted(() => vi.fn());
const updateAssetResourceIndexesAfterCanonicalChange = vi.hoisted(() =>
  vi.fn()
);
const createAssetResourceIndexStore = vi.hoisted(() => vi.fn(() => ({})));
const createAssetClient = vi.hoisted(() => vi.fn(() => ({})));

vi.mock("@webstudio-is/project/index.server", () => ({
  patchLoadedBuild,
}));

vi.mock("./patch-auth.server", () => ({
  assertProjectPermit: vi.fn(),
  authorizePatchEntries,
  createContentModeCapabilities,
  createWriterContext: vi.fn(),
}));
vi.mock("@webstudio-is/asset-uploader/index.server", () => ({
  synchronizeAssetResourceIndexQueries,
  synchronizeAllCanonicalAssetStandardMetadata,
  updateAssetResourceIndexesAfterCanonicalChange,
}));
vi.mock("../../asset-client", () => ({
  createAssetClient,
  createAssetResourceIndexStore,
}));

import {
  applyPatchRequest,
  loadAuthorizedPatchState,
} from "./patch-service.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { NormalizedPatchRequest } from "./patch-normalize.server";

const buildRow = {
  projectId: "project-1",
  version: 3,
  lastTransactionId: null,
  instances: JSON.stringify([]),
  props: JSON.stringify([]),
  styleSources: JSON.stringify([]),
  styleSourceSelections: JSON.stringify([]),
  styles: JSON.stringify([]),
  breakpoints: JSON.stringify([]),
  resources: JSON.stringify([]),
};

const createContext = () => {
  const selectedColumns: string[] = [];
  const context = {
    postgrest: {
      client: {
        from: () => ({
          select: (columns: string) => ({
            selectedColumns,
            eq: () => {
              selectedColumns.push(columns);
              const result = Promise.resolve({
                data: [buildRow],
                error: undefined,
              });
              return Object.assign(result, {
                single: async () => ({
                  data: buildRow,
                  error: undefined,
                }),
              });
            },
          }),
        }),
      },
    },
  };
  return Object.assign(context, {
    selectedColumns,
  }) as unknown as AppContext & { selectedColumns: string[] };
};

const transaction = (id: string, namespace = "props") => ({
  id,
  payload: [{ namespace, patches: [] }],
});

const patch: NormalizedPatchRequest = {
  buildId: "build-1",
  projectId: "project-1",
  clientVersion: 3,
  entries: [
    {
      seq: 1,
      transaction: transaction("tx-1") as never,
      writer: { type: "token", authToken: "token-1" },
    },
    {
      seq: 2,
      transaction: transaction("tx-2") as never,
      writer: { type: "token", authToken: "token-2" },
    },
  ],
};

describe("applyPatchRequest", () => {
  beforeEach(() => {
    patchLoadedBuild.mockReset();
    authorizePatchEntries.mockReset();
    createContentModeCapabilities.mockClear();
    synchronizeAssetResourceIndexQueries.mockReset().mockResolvedValue({
      deletedResourceIds: [],
      updatedResourceIds: [],
    });
    synchronizeAllCanonicalAssetStandardMetadata
      .mockReset()
      .mockResolvedValue(0);
    updateAssetResourceIndexesAfterCanonicalChange
      .mockReset()
      .mockResolvedValue({
        changedAssetIds: [],
        updatedResourceIds: [],
      });
    createAssetResourceIndexStore.mockClear();
  });

  test("synchronizes query indexes after a committed resource patch", async () => {
    const resourceEntry = {
      ...patch.entries[0],
      transaction: transaction("tx-resource", "resources") as never,
    };
    authorizePatchEntries.mockResolvedValue({
      authorized: [{ entry: resourceEntry, context: { writer: 1 } }],
      rejected: [],
    });
    const nextResources = JSON.stringify([
      {
        id: "posts",
        name: "Posts",
        control: "system",
        method: "post",
        url: JSON.stringify("/$resources/assets/query"),
        headers: [],
        body: '{query:"*[]"}',
      },
    ]);
    patchLoadedBuild.mockImplementation(async ({ build }) => ({
      status: "ok",
      version: 4,
      build: { ...build, version: 4, resources: nextResources },
    }));

    await expect(
      applyPatchRequest(createContext(), {
        ...patch,
        entries: [resourceEntry],
      })
    ).resolves.toMatchObject({ status: "ok" });
    expect(synchronizeAssetResourceIndexQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        previousResources: [],
        resources: [expect.objectContaining({ id: "posts" })],
      })
    );
  });

  test("maintains canonical paths and indexes after asset-folder patches", async () => {
    const folderEntry = {
      ...patch.entries[0],
      transaction: {
        id: "tx-folder",
        payload: [
          {
            namespace: "assetFolders",
            patches: [
              { op: "replace", path: ["folder-1", "name"], value: "News" },
            ],
          },
        ],
      } as never,
    };
    authorizePatchEntries.mockResolvedValue({
      authorized: [{ entry: folderEntry, context: { writer: 1 } }],
      rejected: [],
    });
    patchLoadedBuild.mockImplementation(async ({ build }) => ({
      status: "ok",
      version: 4,
      build: { ...build, version: 4 },
    }));

    await expect(
      applyPatchRequest(createContext(), { ...patch, entries: [folderEntry] })
    ).resolves.toMatchObject({ status: "ok" });
    expect(synchronizeAllCanonicalAssetStandardMetadata).toHaveBeenCalledWith({
      client: expect.anything(),
      projectId: "project-1",
    });
    expect(updateAssetResourceIndexesAfterCanonicalChange).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        changedAssetIds: ["folder-1"],
      })
    );
  });

  test("returns per-entry partial results while applying authorized entries", async () => {
    authorizePatchEntries.mockResolvedValue({
      authorized: [{ entry: patch.entries[1], context: { writer: 2 } }],
      rejected: [
        {
          entry: patch.entries[0],
          errors: "You don't have permission to edit this project.",
        },
      ],
    });
    patchLoadedBuild.mockImplementation(async ({ build }) => ({
      status: "ok",
      version: 4,
      build: { ...build, version: 4 },
    }));

    const context = createContext();

    const result = await applyPatchRequest(context, patch);

    expect(createContentModeCapabilities).not.toHaveBeenCalled();
    expect(context.selectedColumns).toEqual([
      "projectId, version",
      "projectId, version, lastTransactionId, props",
    ]);
    expect(authorizePatchEntries).toHaveBeenCalledWith(
      expect.anything(),
      patch,
      expect.any(Function)
    );
    expect(patchLoadedBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        build: expect.objectContaining({ version: 3 }),
        transactions: [patch.entries[1].transaction],
      }),
      { writer: 2 }
    );
    expect(result).toEqual({
      status: "partial",
      version: 4,
      entries: [
        {
          seq: 1,
          transactionId: "tx-1",
          status: "rejected",
          errors: "You don't have permission to edit this project.",
        },
        { seq: 2, transactionId: "tx-2", status: "accepted" },
      ],
    });
  });

  test("loads content-mode capability columns only when authorization requests them", async () => {
    authorizePatchEntries.mockImplementation(
      async (_context, _patch, getInitialContentModeCapabilities) => {
        await getInitialContentModeCapabilities();
        return {
          authorized: [{ entry: patch.entries[0], context: { writer: 1 } }],
          rejected: [],
        };
      }
    );
    patchLoadedBuild.mockImplementation(async ({ build }) => ({
      status: "ok",
      version: 4,
      build: { ...build, version: 4 },
    }));
    const context = createContext();

    const result = await applyPatchRequest(context, patch);

    expect(createContentModeCapabilities).toHaveBeenCalledWith({
      breakpoints: JSON.stringify([]),
      instances: JSON.stringify([]),
      props: JSON.stringify([]),
      styleSourceSelections: JSON.stringify([]),
      styleSources: JSON.stringify([]),
      styles: JSON.stringify([]),
    });
    expect(context.selectedColumns).toEqual([
      "projectId, version",
      "instances, props, styleSources, styleSourceSelections, styles, breakpoints",
      "projectId, version, lastTransactionId, props",
    ]);
    expect(result).toEqual({
      status: "ok",
      version: 4,
      entries: [{ seq: 1, transactionId: "tx-1", status: "accepted" }],
    });
  });

  test("does not load patch columns or persist when every entry is rejected", async () => {
    authorizePatchEntries.mockResolvedValue({
      authorized: [],
      rejected: [
        {
          entry: patch.entries[0],
          errors: "You don't have permission to edit this project.",
        },
      ],
    });
    const context = createContext();

    const result = await applyPatchRequest(context, patch);

    expect(context.selectedColumns).toEqual(["projectId, version"]);
    expect(patchLoadedBuild).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "partial",
      version: 3,
      entries: [
        {
          seq: 1,
          transactionId: "tx-1",
          status: "rejected",
          errors: "You don't have permission to edit this project.",
        },
      ],
    });
  });

  test("loads only base patch columns for asset-only patches", async () => {
    const assetsPatch: NormalizedPatchRequest = {
      ...patch,
      entries: [
        {
          seq: 1,
          transaction: transaction("tx-assets", "assets") as never,
          writer: { type: "token", authToken: "token-1" },
        },
      ],
    };
    authorizePatchEntries.mockResolvedValue({
      authorized: [{ entry: assetsPatch.entries[0], context: { writer: 1 } }],
      rejected: [],
    });
    patchLoadedBuild.mockImplementation(async ({ build }) => ({
      status: "ok",
      version: 4,
      build: { ...build, version: 4 },
    }));
    const context = createContext();

    const result = await applyPatchRequest(context, assetsPatch);

    expect(context.selectedColumns).toEqual([
      "projectId, version",
      "projectId, version, lastTransactionId",
    ]);
    expect(patchLoadedBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        build: expect.objectContaining({
          projectId: "project-1",
          version: 3,
          lastTransactionId: null,
        }),
        transactions: [assetsPatch.entries[0].transaction],
      }),
      { writer: 1 }
    );
    expect(result).toEqual({
      status: "ok",
      version: 4,
      entries: [{ seq: 1, transactionId: "tx-assets", status: "accepted" }],
    });
  });

  test("falls back to per-entry apply when a mixed authorized batch fails", async () => {
    const context = { writer: 1 };
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: patch.entries[0], context },
        { entry: patch.entries[1], context },
      ],
      rejected: [],
    });
    patchLoadedBuild
      .mockResolvedValueOnce({ status: "error", errors: "batch failed" })
      .mockImplementationOnce(async ({ build }) => ({
        status: "ok",
        version: 4,
        build: { ...build, version: 4 },
      }))
      .mockResolvedValueOnce({ status: "error", errors: "entry failed" });

    const result = await applyPatchRequest(createContext(), patch);

    expect(result).toEqual({
      status: "partial",
      version: 4,
      entries: [
        { seq: 1, transactionId: "tx-1", status: "accepted" },
        {
          seq: 2,
          transactionId: "tx-2",
          status: "failed",
          errors: "entry failed",
        },
      ],
    });
  });

  test("applies mixed writer entries with their own context without batching", async () => {
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: patch.entries[0], context: { writer: 1 } },
        { entry: patch.entries[1], context: { writer: 2 } },
      ],
      rejected: [],
    });
    patchLoadedBuild
      .mockImplementationOnce(async ({ build }) => ({
        status: "ok",
        version: 4,
        build: { ...build, version: 4 },
      }))
      .mockImplementationOnce(async ({ build }) => ({
        status: "ok",
        version: 5,
        build: { ...build, version: 5 },
      }));

    const result = await applyPatchRequest(createContext(), patch);

    expect(patchLoadedBuild).toHaveBeenCalledTimes(2);
    expect(patchLoadedBuild).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        build: expect.objectContaining({ version: 3 }),
        clientVersion: 3,
        transactions: [patch.entries[0].transaction],
      }),
      { writer: 1 }
    );
    expect(patchLoadedBuild).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        build: expect.objectContaining({ version: 4 }),
        clientVersion: 4,
        transactions: [patch.entries[1].transaction],
      }),
      { writer: 2 }
    );
    expect(result).toEqual({
      status: "ok",
      version: 5,
      entries: [
        { seq: 1, transactionId: "tx-1", status: "accepted" },
        { seq: 2, transactionId: "tx-2", status: "accepted" },
      ],
    });
  });

  test("preserves entry order when transaction ids are duplicated", async () => {
    const duplicatePatch: NormalizedPatchRequest = {
      ...patch,
      entries: [
        {
          seq: 1,
          transaction: transaction("tx-duplicate") as never,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          seq: 2,
          transaction: transaction("tx-duplicate") as never,
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    };
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: duplicatePatch.entries[1], context: { writer: 2 } },
      ],
      rejected: [
        {
          entry: duplicatePatch.entries[0],
          errors: "You don't have permission to edit this project.",
        },
      ],
    });
    patchLoadedBuild.mockImplementation(async ({ build }) => ({
      status: "ok",
      version: 4,
      build: { ...build, version: 4 },
    }));

    const result = await applyPatchRequest(createContext(), duplicatePatch);

    expect(result).toEqual({
      status: "partial",
      version: 4,
      entries: [
        {
          seq: 1,
          transactionId: "tx-duplicate",
          status: "rejected",
          errors: "You don't have permission to edit this project.",
        },
        { seq: 2, transactionId: "tx-duplicate", status: "accepted" },
      ],
    });
  });

  test("does not convert thrown per-entry persistence errors into terminal entry failures", async () => {
    const context = { writer: 1 };
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: patch.entries[0], context },
        { entry: patch.entries[1], context },
      ],
      rejected: [],
    });
    patchLoadedBuild
      .mockResolvedValueOnce({ status: "error", errors: "batch failed" })
      .mockImplementationOnce(async ({ build }) => ({
        status: "ok",
        version: 4,
        build: { ...build, version: 4 },
      }))
      .mockRejectedValueOnce(new Error("PostgREST unavailable"));

    await expect(applyPatchRequest(createContext(), patch)).rejects.toThrow(
      "PostgREST unavailable"
    );
  });
});

describe("loadAuthorizedPatchState", () => {
  beforeEach(() => {
    createContentModeCapabilities.mockClear();
  });

  test("does not load content-mode capabilities for initial patch state", async () => {
    await expect(
      loadAuthorizedPatchState({
        authToken: "token",
        buildId: "build-1",
        context: createContext(),
      })
    ).resolves.toEqual({
      projectId: "project-1",
      version: 3,
    });

    expect(createContentModeCapabilities).not.toHaveBeenCalled();
  });
});
