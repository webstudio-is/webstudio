import { expect, test, vi } from "vitest";
import { collectionConfigFilename } from "@webstudio-is/content-engine";
import {
  getFileNameParts,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import { AssetUploadCountLimitError } from "@webstudio-is/asset-uploader/server";
import type { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { getGrantedAssetRevisions } from "./page-copy-grant.server";
import type { loadRawBuildById } from "@webstudio-is/project-build/server";
import { createDefaultPages } from "@webstudio-is/project-build";
import { buildPatchTransaction } from "@webstudio-is/protocol/schema";
import {
  getPageCopyAssetCatalogRevision,
  createPageTransferItem,
} from "@webstudio-is/project-build/transfer";
import { createPageCopyData } from "@webstudio-is/project-build/runtime";
import { createBuilderStateFromCompactBuild } from "@webstudio-is/project-build/state";
import type { WebstudioData } from "@webstudio-is/sdk";
import { createPageCopyDestinationAction } from "../routes/rest.page-copy.destination";

const timestamp = "2026-11-17T00:00:00.000Z";
const sourceFolder: AssetFolder = {
  id: "source-folder",
  projectId: "source",
  name: "Images",
  createdAt: timestamp,
};
const destinationFolder: AssetFolder = {
  ...sourceFolder,
  id: "destination-folder",
  projectId: "destination",
};
const asset: Asset = {
  id: "source-asset",
  projectId: "source",
  folderId: sourceFolder.id,
  type: "file",
  format: "json",
  name: "document_storage.json",
  filename: "document",
  size: 1,
  createdAt: timestamp,
  description: null,
  meta: {},
};

const fixture = ({
  sourceAsset = asset,
  blockCapacity = false,
}: {
  sourceAsset?: Asset;
  blockCapacity?: boolean;
} = {}) => {
  const insert = vi.fn(async () => ({ error: null }));
  const context = {
    postgrest: { client: { from: () => ({ insert }) } },
  } as unknown as AppContext;
  const pages = createDefaultPages({
    homePageId: "home",
    rootInstanceId: "body",
  });
  const compactBuild = {
    id: "destination-build",
    projectId: "destination",
    version: 8,
    createdAt: timestamp,
    updatedAt: timestamp,
    deployment: undefined,
    marketplaceProduct: undefined,
    pages,
    instances: [
      { id: "body", type: "instance", component: "Body", children: [] },
    ],
    assets: [],
    breakpoints: [],
    props: [],
    styleSources: [],
    styleSourceSelections: [],
    styles: [],
    dataSources: [],
    resources: [],
    projectSettings: { meta: {}, compiler: {} },
  } as Awaited<ReturnType<typeof loadDevBuildByProjectId>>;
  const rawBuild = {
    id: "destination-build",
    projectId: "destination",
    version: 8,
    deployment: null,
  } as Awaited<ReturnType<typeof loadRawBuildById>>;
  const patchBuild = vi.fn(async () => ({
    status: "ok" as const,
    version: 9,
    build: rawBuild,
  }));
  const action = createPageCopyDestinationAction({
    authorize: async () => ({ projectId: "destination", context }),
    checkCsrf: async () => undefined,
    loadBuild: async () => compactBuild,
    loadRawBuild: async () => rawBuild,
    patchBuild,
    loadAssets: async (projectId) =>
      projectId === "source"
        ? { assets: [sourceAsset], assetFolders: [sourceFolder] }
        : { assets: [], assetFolders: [destinationFolder] },
    loadFolders: async () => [destinationFolder],
    readGrant: async () => ({
      projectId: "source",
      pageId: "page",
      buildId: "source-build",
      version: 4,
      assetIds: [sourceAsset.id],
      assetRevisions: getGrantedAssetRevisions([sourceAsset], [sourceFolder]),
      purpose: "webstudio.page-copy.read.v2",
      exp: 2_000_000_000,
    }),
    isCurrentGrant: async () => true,
    assertCapacity: async () => {
      if (blockCapacity) {
        throw new AssetUploadCountLimitError(1);
      }
    },
    createAssetStore: () => ({
      async readFile() {
        return {
          data: (async function* () {
            yield new TextEncoder().encode("{");
          })(),
        };
      },
      async uploadFile() {
        throw new Error("Same-storage alias uploaded bytes");
      },
    }),
  });
  const transfer = (folderId = destinationFolder.id, expectedVersion = 8) =>
    action({
      params: {},
      context: {},
      request: new Request(
        "https://destination.example/rest/page-copy/destination?projectId=destination",
        {
          method: "POST",
          headers: {
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            kind: "relink",
            grant: "source-grant",
            expectedVersion,
            assets: [
              {
                sourceId: sourceAsset.id,
                expectedName: sourceAsset.name,
                targetId: "target-asset",
                folderId,
              },
            ],
          }),
        }
      ),
    });
  return { insert, transfer, action, compactBuild, patchBuild };
};

test("links the existing File only into a destination-owned folder", async () => {
  const { insert, transfer } = fixture();
  expect((await transfer(sourceFolder.id)).status).toBe(409);
  expect(insert).not.toHaveBeenCalled();
  expect((await transfer(undefined, 7)).status).toBe(409);
  expect(insert).not.toHaveBeenCalled();
  const result = await transfer();
  expect(result.status).toBe(200);
  expect(insert).toHaveBeenCalledWith([
    expect.objectContaining({
      name: asset.name,
      projectId: "destination",
      folderId: destinationFolder.id,
    }),
  ]);
});

test("rejects a same-storage alias when the destination has exhausted its capacity", async () => {
  const { insert, transfer } = fixture({ blockCapacity: true });
  expect((await transfer()).ok).toBe(false);
  expect(insert).not.toHaveBeenCalled();
});

test("rejects an invalid collection manifest before inserting its aliases", async () => {
  const { insert, transfer } = fixture({
    sourceAsset: {
      ...asset,
      filename: getFileNameParts(collectionConfigFilename).basename,
    },
  });
  expect((await transfer()).ok).toBe(false);
  expect(insert).not.toHaveBeenCalled();
});

test("commits semantic page insertion without changing the public raw patch restriction", async () => {
  const { action, compactBuild, patchBuild } = fixture();
  const data = createBuilderStateFromCompactBuild(
    compactBuild
  ) as WebstudioData;
  const page = compactBuild.pages.pages.get("home")!;
  const item = createPageTransferItem(
    createPageCopyData({ data, page }),
    new Map()
  );
  const pageId = "AAAAAAAAAAAAAAAAAAAAA";
  const transactionId = "BBBBBBBBBBBBBBBBBBBBB";
  const assetCatalogRevision = await getPageCopyAssetCatalogRevision(
    [],
    new Map([[destinationFolder.id, destinationFolder]])
  );
  const result = await action({
    params: {},
    context: {},
    request: new Request(
      "https://destination.example/rest/page-copy/destination?projectId=destination",
      {
        method: "POST",
        headers: {
          "sec-fetch-site": "same-origin",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          kind: "commit",
          transactionId,
          pageId,
          transfer: { item, targetFolderId: compactBuild.pages.rootFolderId },
          guard: {
            buildId: compactBuild.id,
            baseVersion: 8,
            assetCatalogRevision,
          },
        }),
      }
    ),
  });
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ pageId, version: 9 });
  expect(patchBuild).toHaveBeenCalledWith(
    expect.objectContaining({
      transactions: [expect.objectContaining({ id: transactionId })],
    }),
    expect.anything()
  );
  const call = patchBuild.mock.calls[0] as unknown as [
    {
      transactions: {
        payload: {
          namespace: string;
          patches: { op: string; path: string[] }[];
        }[];
      }[];
    },
  ];
  const [transaction] = call[0].transactions;
  expect(transaction.payload).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        namespace: "pages",
        patches: expect.arrayContaining([
          expect.objectContaining({ op: "add", path: ["pages", pageId] }),
        ]),
      }),
      expect.objectContaining({ namespace: "instances" }),
    ])
  );
  expect(buildPatchTransaction.safeParse(transaction).success).toBe(false);
});

test("malformed destination JSON returns a generic error without logging body content", async () => {
  const { action } = fixture();
  const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    const response = await action({
      params: {},
      context: {},
      request: new Request(
        "https://destination.example/rest/page-copy/destination?projectId=destination",
        {
          method: "POST",
          headers: {
            "sec-fetch-site": "same-origin",
            "content-type": "application/json",
          },
          body: '{"grant":"malformed-capability',
        }
      ),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "PAGE_COPY_INVALID_INPUT" });
    expect(logger).not.toHaveBeenCalled();
  } finally {
    logger.mockRestore();
  }
});
