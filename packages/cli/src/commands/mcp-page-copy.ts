import deepEqual from "fast-deep-equal";
import * as httpClient from "@webstudio-is/http-client";
import {
  getPublicBuildIncludes,
  publicApiContractVersion,
} from "@webstudio-is/protocol";
import {
  assetContentDescriptorHeader,
  parseAssetContentDescriptor,
} from "@webstudio-is/protocol/asset-resource-api";
import { pageCopyNamespaces } from "@webstudio-is/project-build/contracts";
import {
  createPageCopyData,
  executeBuilderRuntimeOperation,
  type BuilderRuntimeMutation,
} from "@webstudio-is/project-build/runtime";
import type { ProjectSessionCopyPageInput } from "@webstudio-is/project-build/mcp";
import {
  createPageTransferItem,
  executePageTransfer,
  pageCopyError,
  pageCopyFailure,
  createPageCopyArtifacts,
  trackPageCopyFolder,
  planPageTransfer,
  previewPageTransfer,
  prepareConnectedContentBlockFragment,
  projectPageCopyAssets,
  type PageTransferData,
} from "@webstudio-is/project-build/transfer";
import {
  createId,
  createAssetFolderHierarchy,
  findPageByIdOrPath,
  type WebstudioData,
} from "@webstudio-is/sdk";
import type { ApiConnection } from "../api-connection";
import {
  assertCliEditingContractVersion,
  getCliServerApiContract,
  toRemoteSnapshot,
} from "../project-session";

const snapshotNamespaces = [...pageCopyNamespaces, "assetFolders"] as const;
const getSnapshot = async (connection: ApiConnection) =>
  toRemoteSnapshot(
    (await httpClient.getBuildSnapshot({
      ...connection,
      include: getPublicBuildIncludes(snapshotNamespaces),
    })) as Parameters<typeof toRemoteSnapshot>[0]
  );

export const copyMcpPage = async ({
  args,
  dryRun,
  destination,
  source,
}: {
  args: ProjectSessionCopyPageInput;
  dryRun: boolean;
  destination: ApiConnection;
  source: ApiConnection;
}) => {
  const [contract, sourceInfo, destinationInfo] = await Promise.all([
    getCliServerApiContract(destination),
    httpClient.getPageCopySource(source),
    httpClient.getPageCopyDestination(destination),
  ]);
  assertCliEditingContractVersion(contract);
  if (destinationInfo.contractVersion !== publicApiContractVersion) {
    throw pageCopyError("API_CONTRACT_MISMATCH");
  }
  if (sourceInfo.contractVersion !== publicApiContractVersion) {
    throw pageCopyError("PAGE_COPY_SOURCE_UNSUPPORTED");
  }
  const [sourceSnapshot, destinationSnapshot] = await Promise.all([
    getSnapshot(source),
    getSnapshot(destination),
  ]);
  if (
    sourceInfo.version !== sourceSnapshot.version ||
    sourceInfo.buildId !== sourceSnapshot.buildId
  ) {
    throw pageCopyError("PAGE_COPY_SOURCE_STALE");
  }
  if (
    destinationInfo.buildId !== destinationSnapshot.buildId ||
    destinationInfo.version !== destinationSnapshot.version
  ) {
    throw pageCopyError("PAGE_COPY_STALE");
  }

  const sourceData = sourceSnapshot.state as WebstudioData;
  const targetData = destinationSnapshot.state as WebstudioData;
  const page = findPageByIdOrPath(args.sourcePage, sourceData.pages);
  if (page === undefined) {
    throw pageCopyError("NOT_FOUND");
  }
  const item = createPageTransferItem(
    createPageCopyData({ data: sourceData, page }),
    sourceData.assets
  );
  for (const key of ["rootFragment", "bodyFragment"] as const) {
    item[key] = prepareConnectedContentBlockFragment({
      fragment: item[key],
      assets: sourceData.assets,
    });
  }
  const makeMutation = async (item: PageTransferData, data: WebstudioData) =>
    await executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<{ id: string }>
    >({
      id: "pageTransfer.insert",
      state: data,
      context: { createId: () => createId("nano") },
      input: {
        projectId: destination.projectId,
        targetFolderId: args.targetFolderId ?? data.pages.rootFolderId,
        conflictResolution: args.conflictResolution,
        rootStyleConflictResolution: args.rootStyleConflictResolution,
        item,
      },
    });

  if (
    sourceData.assetFolders === undefined ||
    targetData.assetFolders === undefined
  ) {
    throw pageCopyError("PAGE_COPY_UNSUPPORTED");
  }
  const previous = {
    assets: [...targetData.assets.values()],
    folders: [...targetData.assetFolders.values()],
  };
  const documents = new Map<string, string>();
  const sameStorage = sourceInfo.storageScope === destinationInfo.storageScope;
  const plan = await planPageTransfer({
    item,
    source: {
      assets: [...sourceData.assets.values()],
      folders: [...sourceData.assetFolders.values()],
    },
    target: previous,
    targetProjectId: destination.projectId,
    sameStorage,
    sameProject: sameStorage && source.projectId === destination.projectId,
    hasRenderedScope: false,
    readDocument: async (asset) => {
      const response = await httpClient.readProjectAssetContent({
        ...source,
        assetId: asset.id,
      });
      const descriptor = parseAssetContentDescriptor(
        response.headers.get(assetContentDescriptorHeader)
      );
      if (
        descriptor?.name !== asset.name ||
        descriptor?.id !== asset.id ||
        descriptor.projectId !== source.projectId
      ) {
        throw pageCopyError("PAGE_COPY_SOURCE_STALE");
      }
      const contents = await response.text();
      documents.set(asset.id, contents);
      return contents;
    },
  });
  const grantInfo = await httpClient.issuePageCopySourceGrant(source, {
    pageId: page.id,
    assetIds: plan.assets.map(({ source }) => source.id),
  });
  if (
    grantInfo.version !== sourceInfo.version ||
    grantInfo.buildId !== sourceInfo.buildId ||
    grantInfo.storageScope !== sourceInfo.storageScope
  ) {
    throw pageCopyError("PAGE_COPY_SOURCE_STALE");
  }
  const scopedAssets = plan.assets.map(({ source }) => source);
  const sourceHierarchy = createAssetFolderHierarchy(sourceData.assetFolders);
  const scopedFolders = new Map(
    scopedAssets.flatMap(({ folderId }) =>
      sourceHierarchy
        .getPath(folderId)
        .map((folder) => [folder.id, folder] as const)
    )
  );
  const validateSource = async () => {
    const current = await httpClient.readPageCopySourceManifest(
      source.origin,
      grantInfo.grant
    );
    const assetsById = new Map(
      current.assets.map((asset) => [asset.id, asset])
    );
    const foldersById = new Map(
      current.folders.map((folder) => [folder.id, folder])
    );
    if (
      current.source.version !== sourceInfo.version ||
      current.source.buildId !== sourceInfo.buildId ||
      current.source.projectId !== source.projectId ||
      current.source.pageId !== page.id ||
      current.assets.length !== scopedAssets.length ||
      current.folders.length !== scopedFolders.size ||
      scopedAssets.some(
        (asset) => !deepEqual(asset, assetsById.get(asset.id))
      ) ||
      [...scopedFolders].some(
        ([id, folder]) => !deepEqual(folder, foldersById.get(id))
      )
    ) {
      throw pageCopyError("PAGE_COPY_SOURCE_STALE");
    }
  };
  await validateSource();
  await makeMutation(previewPageTransfer(plan), {
    ...targetData,
    assets: new Map([
      ...targetData.assets,
      ...plan.assets.map(({ target }) => [target.id, target] as const),
    ]),
  });
  if (dryRun) {
    return {
      dryRun: true,
      sameStorage,
      assetFolders: plan.folders.length,
      reusedAssets: plan.assets.filter(({ reuse }) => reuse).length,
      linkedAssets: sameStorage
        ? plan.assets.filter(({ reuse }) => !reuse).length
        : 0,
      uploadedAssets: sameStorage ? 0 : plan.assets.length,
      documentReads: documents.size,
      targetFolderId: args.targetFolderId ?? targetData.pages.rootFolderId,
    };
  }

  const artifacts = createPageCopyArtifacts();
  let pendingPageId: string | undefined;
  const readAsset = (asset: (typeof plan.assets)[number]["source"]) =>
    httpClient.readPageCopySourceAsset(source.origin, grantInfo.grant, asset);
  try {
    return await executePageTransfer({
      plan,
      createFolder: ({ name, parentId }) =>
        trackPageCopyFolder(
          artifacts,
          { name, parentId },
          async () =>
            (
              await httpClient.createProjectAssetFolder({
                ...destination,
                name,
                parentId,
              })
            ).folder
        ),
      stageAssets: (plans) =>
        projectPageCopyAssets({
          plans,
          sameStorage,
          relink: async (plans) => {
            artifacts.unconfirmedAssetIds.push(
              ...plans.map(({ target }) => target.id)
            );
            const { created, reused } = await httpClient.relinkPageCopyAssets(
              destination,
              {
                grant: grantInfo.grant,
                expectedVersion: destinationSnapshot.version,
                assets: plans.map(({ source, target }) => ({
                  sourceId: source.id,
                  expectedName: source.name,
                  targetId: target.id,
                  folderId: target.folderId,
                })),
              }
            );
            artifacts.unconfirmedAssetIds = [];
            artifacts.assetIds.push(...created.map(({ id }) => id));
            return [...created, ...reused];
          },
          upload: async ({ source, target, document }) => {
            const asset = await httpClient.uploadPageCopyAsset({
              connection: destination,
              source,
              target,
              document,
              read: readAsset,
              onReserveStarted: () =>
                artifacts.unconfirmedAssetIds.push(target.id),
              onReserved: (reservation) => {
                artifacts.unconfirmedAssetIds = [];
                artifacts.reservations.push(reservation);
              },
            });
            artifacts.assetIds.push(asset.id);
            return asset;
          },
        }),
      readTarget: async () => {
        const [{ assets }, { folders }] = await Promise.all([
          httpClient.listProjectAssets(destination),
          httpClient.listProjectAssetFolders(destination),
        ]);
        return { assets, folders };
      },
      commit: async (item, revision) => {
        await validateSource();
        const current = await getSnapshot(destination);
        if (
          current.version !== destinationSnapshot.version ||
          current.buildId !== destinationSnapshot.buildId
        ) {
          throw pageCopyError("PAGE_COPY_STALE");
        }
        const state = current.state as WebstudioData;
        const transactionId = createId("nano");
        const pageId = createId("nano");
        pendingPageId = pageId;
        try {
          const { version } = await httpClient.commitPageCopyPatch(
            destination,
            {
              guard: {
                buildId: current.buildId,
                baseVersion: current.version,
                assetCatalogRevision: revision,
              },
              transactionId,
              pageId,
              transfer: {
                item,
                targetFolderId: args.targetFolderId ?? state.pages.rootFolderId,
                conflictResolution: args.conflictResolution,
                rootStyleConflictResolution: args.rootStyleConflictResolution,
              },
            }
          );
          return { pageId: pageId, version };
        } catch (error) {
          const observed = await httpClient
            .getPageCopyDestination(destination, pageId)
            .catch(() => undefined);
          if (observed?.pageExists === true) {
            return { pageId: pageId, version: observed.version };
          }
          const status = httpClient.getErrorStatus(error);
          if (status !== undefined && status >= 400 && status < 500) {
            pendingPageId = undefined;
          }
          throw error;
        }
      },
    });
  } catch (error) {
    return pageCopyFailure(error, artifacts, pendingPageId);
  }
};
