import * as httpClient from "@webstudio-is/http-client";
import type {
  ConflictResolution,
  RootStyleConflictResolution,
} from "@webstudio-is/project-build/runtime";
import {
  executeBuilderRuntimeOperation,
  type BuilderRuntimeMutation,
} from "@webstudio-is/project-build/runtime";
import {
  executePageTransfer,
  pageCopyError,
  pageCopyFailure,
  createPageCopyArtifacts,
  getStaticAssetResourceDependencies,
  planPageTransfer,
  previewPageTransfer,
  projectPageCopyAssets,
  trackPageCopyFolder,
  type PageTransferData,
} from "@webstudio-is/project-build/transfer";
import { createId, hasAssetsResourceUrl, type Asset } from "@webstudio-is/sdk";
import { fetch as builderFetch } from "../fetch.client";
import { getWebstudioData } from "../instance-utils/data";
import {
  commitGuardedPageCopy,
  createSyncChangesFromBuilderPatchPayload,
} from "../sync/builder-patch";
import { $project } from "../sync/data-stores";
import { draftPersistence } from "../sync/draft-persistence";
import { externalContentSyncStore } from "../sync/sync-stores";
import { invalidateAssets } from "../resources";
import { includeMdxAssetDependencies } from "./content-block-fragment";

const sourceFetch = globalThis.fetch;
export const hasPageCopyAssetsQuery = (item: PageTransferData) =>
  [item.rootFragment, item.bodyFragment].some(({ resources }) =>
    resources.some(hasAssetsResourceUrl)
  );

export const getPageClipboardGrant = async ({
  projectId,
  item,
  renewGrant,
  request = builderFetch,
  expectedRevision,
  sourceCatalog,
}: {
  projectId: string;
  item: PageTransferData;
  renewGrant?: string;
  request?: typeof fetch;
  expectedRevision?: { buildId: string; version: number };
  sourceCatalog?: Pick<
    ReturnType<typeof getWebstudioData>,
    "assets" | "assetFolders"
  >;
}) => {
  const connection = { origin: window.location.origin, projectId, request };
  const pageId = item.page.id;
  if (renewGrant !== undefined) {
    return httpClient.issuePageCopySourceGrant(connection, {
      pageId,
      renewGrant,
    });
  }
  const fragments = [item.rootFragment, item.bodyFragment];
  const assetIds = new Set(
    fragments.flatMap(({ assets }) => assets.map(({ id }) => id))
  );
  if (hasPageCopyAssetsQuery(item)) {
    if (sourceCatalog === undefined) {
      // The clipboard alone cannot determine the results of a source query.
      throw pageCopyError("PAGE_COPY_RECOPY_REQUIRED");
    }
    const { assets, assetFolders } = sourceCatalog;
    const queries = getStaticAssetResourceDependencies(fragments, [
      ...assets.values(),
    ]);
    const dependencies = await includeMdxAssetDependencies({
      fragment: {
        ...item.bodyFragment,
        assets: [...queries.values()].flatMap(({ assets }) => assets),
      },
      projectId,
      assets,
      assetFolders,
    });
    if (dependencies.skippedAssetIds.length > 0) {
      throw pageCopyError("PAGE_COPY_RECOPY_REQUIRED");
    }
    for (const { id } of dependencies.fragment.assets) {
      assetIds.add(id);
    }
  }
  return httpClient.issuePageCopySourceGrant(connection, {
    pageId,
    assetIds: [...assetIds],
    expectedRevision,
  });
};

export const transferBuilderPage = async ({
  item,
  sourceOrigin,
  sourceGrant,
  sourceProjectId,
  sourceRevision,
  targetFolderId,
  projectId,
  conflictResolution,
  rootStyleConflictResolution,
  request = builderFetch,
  readSourceRequest = sourceFetch,
  destinationOrigin = window.location.origin,
}: {
  item: PageTransferData;
  sourceOrigin: string | undefined;
  sourceGrant: string | undefined;
  sourceProjectId: string | undefined;
  sourceRevision: { buildId: string; version: number } | undefined;
  targetFolderId: string;
  projectId: string;
  conflictResolution: ConflictResolution | undefined;
  rootStyleConflictResolution: RootStyleConflictResolution | undefined;
  request?: typeof fetch;
  readSourceRequest?: typeof fetch;
  destinationOrigin?: string;
}) => {
  const origin = new URL(sourceOrigin ?? destinationOrigin).origin;
  const destination = {
    origin: destinationOrigin,
    requestOrigin: destinationOrigin,
    projectId,
    request,
  };
  const originUrl = new URL(origin);
  if (originUrl.protocol !== "https:" && origin !== destinationOrigin) {
    throw pageCopyError("PAGE_COPY_SOURCE_UNSUPPORTED");
  }
  const candidateProjects = new Set(
    [item.rootFragment, item.bodyFragment].flatMap(({ assets }) =>
      assets.map(({ projectId }) => projectId)
    )
  );
  const candidate =
    sourceProjectId ??
    (candidateProjects.size === 1 ? [...candidateProjects][0] : undefined);
  const renewSource = async (current?: string) => {
    if (origin !== destinationOrigin || candidate === undefined) {
      throw pageCopyError("PAGE_COPY_RECOPY_REQUIRED");
    }
    return await getPageClipboardGrant({
      projectId: candidate,
      item,
      renewGrant: current,
      request,
    });
  };
  if (sourceGrant === undefined) {
    const authorized = await renewSource();
    sourceGrant = authorized.grant;
    sourceRevision = authorized;
  }
  let grant = sourceGrant;
  const readManifest = async () => {
    try {
      return await httpClient.readPageCopySourceManifest(
        origin,
        grant,
        readSourceRequest
      );
    } catch (error) {
      if (httpClient.getErrorStatus(error) !== 403) {
        throw error;
      }
      grant = (await renewSource(grant)).grant;
      return await httpClient.readPageCopySourceManifest(
        origin,
        grant,
        readSourceRequest
      );
    }
  };
  const awaitDraft = () =>
    draftPersistence.wait(projectId, { signal: AbortSignal.timeout(30_000) });
  await awaitDraft();
  const getCatalog = async () => {
    const [{ assets }, { folders }] = await Promise.all([
      httpClient.listProjectAssets(destination),
      httpClient.listProjectAssetFolders(destination),
    ]);
    return { assets, folders };
  };
  const [source, target, initial] = await Promise.all([
    readManifest(),
    getCatalog(),
    httpClient.getPageCopyDestination(destination),
  ]);
  if (
    source.source.pageId !== item.page.id ||
    (sourceProjectId !== undefined &&
      source.source.projectId !== sourceProjectId) ||
    (sourceRevision !== undefined &&
      (source.source.buildId !== sourceRevision.buildId ||
        source.source.version !== sourceRevision.version))
  ) {
    throw pageCopyError("PAGE_COPY_SOURCE_UNAUTHORIZED");
  }
  const sameStorage = source.storageScope === initial.storageScope;
  const read = (asset: Asset) =>
    httpClient.readPageCopySourceAsset(origin, grant, asset, readSourceRequest);
  const plan = await planPageTransfer({
    item,
    source,
    target,
    targetProjectId: projectId,
    sameStorage,
    sameProject: sameStorage && source.source.projectId === projectId,
    hasRenderedScope: true,
    readDocument: async (asset) => await (await read(asset)).text(),
  });

  const mutate = async (item: PageTransferData, state = getWebstudioData()) =>
    await executeBuilderRuntimeOperation<
      BuilderRuntimeMutation<{ id: string; didReachBreakpointLimit: boolean }>
    >({
      id: "pageTransfer.insert",
      state,
      context: { createId: () => createId("nano") },
      input: {
        item,
        projectId,
        targetFolderId,
        conflictResolution,
        rootStyleConflictResolution,
      },
    });
  const state = getWebstudioData();
  await mutate(previewPageTransfer(plan), {
    ...state,
    assets: new Map([
      ...state.assets,
      ...plan.assets.map(({ target }) => [target.id, target] as const),
    ]),
  });
  const persisted = {
    assets: new Map<string, Asset>(),
    folders: new Map<string, (typeof target.folders)[number]>(),
  };
  const assertProject = () => {
    if ($project.get()?.id !== projectId) {
      throw pageCopyError("PAGE_COPY_STALE");
    }
  };
  let didReachBreakpointLimit = false;
  const artifacts = createPageCopyArtifacts();
  let pendingPageId: string | undefined;
  const validateSource = async () => {
    const current = await readManifest();
    const byId = new Map(current.assets.map((asset) => [asset.id, asset]));
    if (
      current.source.buildId !== source.source.buildId ||
      current.source.version !== source.source.version ||
      plan.assets.some(
        ({ source }) => byId.get(source.id)?.name !== source.name
      )
    ) {
      throw pageCopyError("PAGE_COPY_SOURCE_STALE");
    }
  };
  await validateSource();
  try {
    const result = await executePageTransfer({
      plan,
      createFolder: async ({ name, parentId }) => {
        assertProject();
        const folder = await trackPageCopyFolder(
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
        );
        persisted.folders.set(folder.id, folder);
        return folder;
      },
      stageAssets: async (plans) => {
        assertProject();
        return await projectPageCopyAssets({
          plans,
          sameStorage,
          relink: async (plans) => {
            artifacts.unconfirmedAssetIds.push(
              ...plans.map(({ target }) => target.id)
            );
            const { created, reused } = await httpClient.relinkPageCopyAssets(
              destination,
              {
                grant,
                expectedVersion: initial.version,
                assets: plans.map(({ source, target }) => ({
                  sourceId: source.id,
                  targetId: target.id,
                  expectedName: source.name,
                  folderId: target.folderId,
                })),
              }
            );
            artifacts.unconfirmedAssetIds = [];
            artifacts.assetIds.push(...created.map(({ id }) => id));
            for (const asset of created) {
              persisted.assets.set(asset.id, asset);
            }
            return [...created, ...reused];
          },
          upload: async ({ source, target, document }) => {
            assertProject();
            const asset = await httpClient.uploadPageCopyAsset({
              connection: destination,
              source,
              target,
              read,
              document,
              onReserveStarted: () =>
                artifacts.unconfirmedAssetIds.push(target.id),
              onReserved: (reservation) => {
                artifacts.unconfirmedAssetIds = [];
                artifacts.reservations.push(reservation);
              },
            });
            persisted.assets.set(asset.id, asset);
            artifacts.assetIds.push(asset.id);
            return asset;
          },
        });
      },
      readTarget: getCatalog,
      commit: async (item, revision) => {
        assertProject();
        await awaitDraft();
        await validateSource();
        const current = await httpClient.getPageCopyDestination(destination);
        assertProject();
        if (
          current.version !== initial.version ||
          current.buildId !== initial.buildId
        ) {
          throw pageCopyError("PAGE_COPY_STALE");
        }
        const previousState = getWebstudioData();
        const assetPatches = [...persisted.assets.values()].map((asset) => ({
          op: "add" as const,
          path: [asset.id],
          value: asset,
        }));
        const folderPatches = [...persisted.folders.values()].map((folder) => ({
          op: "add" as const,
          path: [folder.id],
          value: folder,
        }));
        // These were persisted by the asset API. Only share the records with
        // Builder and the canvas, without queuing another database write.
        externalContentSyncStore.createTransactionFromChanges(
          createSyncChangesFromBuilderPatchPayload({
            data: previousState,
            payload: [
              { namespace: "assets", patches: assetPatches },
              { namespace: "assetFolders", patches: folderPatches },
            ],
          })
        );
        invalidateAssets();
        const mutation = await mutate(item);
        didReachBreakpointLimit = mutation.result.didReachBreakpointLimit;
        assertProject();
        pendingPageId = mutation.result.id;
        const committed = await commitGuardedPageCopy({
          data: getWebstudioData(),
          payload: mutation.payload,
          guard: {
            buildId: initial.buildId,
            baseVersion: initial.version,
            assetCatalogRevision: revision,
            stagedCatalog: {
              assetIds: [...persisted.assets.keys()],
              folderIds: [...persisted.folders.keys()],
            },
          },
        });
        if (committed !== true) {
          const observed = await httpClient
            .getPageCopyDestination(destination, mutation.result.id)
            .catch(() => undefined);
          if (observed?.pageExists !== true) {
            if (committed === false && observed?.pageExists === false) {
              pendingPageId = undefined;
            }
            throw pageCopyError("PAGE_COPY_STALE");
          }
        }
        return { pageId: mutation.result.id };
      },
    });
    return { ...result, status: "committed" as const, didReachBreakpointLimit };
  } catch (error) {
    return pageCopyFailure(error, artifacts, pendingPageId);
  }
};
