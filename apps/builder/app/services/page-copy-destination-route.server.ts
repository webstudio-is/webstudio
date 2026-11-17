import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  assertAssetCapacity,
  createAssetRows,
  loadAssetDataByProject,
  loadAssetFoldersByProjectWithClient,
  validateCollectionAssetPatch,
  PostgresAssetRepository,
} from "@webstudio-is/asset-uploader/server";
import { readBoundedRequestBytes } from "@webstudio-is/content-engine";
import {
  isAssetFileName,
  publicApiContractVersion,
} from "@webstudio-is/protocol";
import { pageTransferInsertInput } from "@webstudio-is/project-build/runtime";
import { executeApiRuntimeMutation } from "~/services/api-runtime.server";
import {
  createClipboardAssetPaths,
  pageTransferPageInput,
} from "@webstudio-is/project-build/transfer";
import {
  loadDevBuildByProjectId,
  loadRawBuildById,
} from "@webstudio-is/project-build/server";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { z } from "zod";
import { createAssetClient } from "~/shared/asset-client";
import { patchLoadedBuild } from "@webstudio-is/project/index.server";
import { assertCliApiContractVersion } from "~/services/api-compatibility.server";
import { validatePageCopyGuard } from "~/shared/sync/page-copy-guard.server";
import { authorizeApiProject, ensureApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  parseAssetRestIdentifier,
} from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import {
  getPageCopyStorageScope,
  isCurrentPageCopyGrant,
  matchesGrantedAssetRevisions,
  readPageCopyGrant,
} from "~/services/page-copy-grant.server";

const relinkInput = z.object({
  kind: z.literal("relink"),
  grant: z.string().min(1),
  expectedVersion: z.number().int().nonnegative(),
  assets: z
    .array(
      z.object({
        sourceId: z.string().min(1),
        expectedName: z.string().min(1),
        targetId: z.string().min(1).max(256),
        folderId: z.string().min(1).max(256).optional(),
      })
    )
    .max(500),
});

const requestInput = z.discriminatedUnion("kind", [
  relinkInput,
  z.object({
    kind: z.literal("reserve"),
    assetId: z.string().min(1).max(256),
    filename: z.string().refine(isAssetFileName),
    type: z.enum(["image", "font", "file", "video"]),
    folderId: z.string().min(1).max(256).optional(),
    description: z.string().max(4096).optional(),
  }),
  z.object({
    kind: z.literal("commit"),
    transactionId: z.string().regex(/^[a-zA-Z0-9_-]{21}$/),
    pageId: z.string().regex(/^[a-zA-Z0-9_-]{21}$/),
    transfer: pageTransferInsertInput
      .omit({ projectId: true, item: true })
      .extend({
        item: pageTransferPageInput,
      }),
    guard: z.object({
      buildId: z.string(),
      baseVersion: z.number().int().nonnegative(),
      assetCatalogRevision: z.string(),
    }),
  }),
]);

const authorizeDestination = async (request: Request) => {
  const projectId = parseAssetRestIdentifier(
    new URL(request.url).searchParams.get("projectId")
  );
  const context = await authorizeApiProject(request, projectId, "build");
  if (
    (await authorizeProject.hasProjectPermit(
      { projectId, permit: "build" },
      context
    )) === false
  ) {
    throw new Response(null, { status: 403, statusText: "Forbidden" });
  }
  return { projectId, context };
};

export const loadPageCopyRoute = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  try {
    const { projectId, context } = await authorizeDestination(request);
    const storageScope = getPageCopyStorageScope();
    if (storageScope === undefined) {
      return json({ code: "PAGE_COPY_UNSUPPORTED" }, { status: 501 });
    }
    const build = await loadDevBuildByProjectId(context, projectId);
    const pageId = new URL(request.url).searchParams.get("pageId");
    return json(
      {
        storageScope,
        contractVersion: publicApiContractVersion,
        buildId: build.id,
        version: build.version,
        ...(pageId === null
          ? {}
          : { pageExists: build.pages.pages.has(pageId) }),
      },
      { headers: privateNoStoreResponseHeaders }
    );
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};

const destinationDependencies = {
  authorize: authorizeDestination,
  checkCsrf: ensureApiCsrf,
  loadBuild: loadDevBuildByProjectId,
  loadRawBuild: loadRawBuildById,
  patchBuild: patchLoadedBuild,
  loadAssets: loadAssetDataByProject,
  loadFolders: loadAssetFoldersByProjectWithClient,
  readGrant: readPageCopyGrant,
  isCurrentGrant: isCurrentPageCopyGrant,
  assertCapacity: assertAssetCapacity,
  createAssetStore: createAssetClient,
};

export const createPageCopyDestinationAction =
  (dependencies = destinationDependencies) =>
  async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
      return new Response(null, { status: 405 });
    }
    preventCrossOriginCookie(request);
    await dependencies.checkCsrf(request);
    try {
      const { projectId, context } = await dependencies.authorize(request);
      assertCliApiContractVersion(context);
      const parseInput = async () => {
        try {
          const body = await readBoundedRequestBytes(request, 8 * 1024 * 1024);
          return requestInput.safeParse(
            JSON.parse(new TextDecoder().decode(body))
          );
        } catch {
          // JSON parser errors may contain fragments of the request body.
          return;
        }
      };
      const parsed = await parseInput();
      if (parsed?.success !== true) {
        return json({ code: "PAGE_COPY_INVALID_INPUT" }, { status: 400 });
      }
      const input = parsed.data;
      if (input.kind === "reserve") {
        if (input.folderId !== undefined) {
          const folders = await dependencies.loadFolders(
            projectId,
            context.postgrest.client
          );
          if (!folders.some(({ id }) => id === input.folderId)) {
            return json(
              { code: "PAGE_COPY_DESTINATION_FOLDER_MISMATCH" },
              { status: 409 }
            );
          }
        }
        const repository = new PostgresAssetRepository({
          projectId,
          context,
          assetStore: dependencies.createAssetStore(),
        });
        const ticket = await repository.createUploadTicket(
          {
            type: input.type,
            filename: input.filename,
            folderId: input.folderId,
            description: input.description,
          },
          () => input.assetId
        );
        return json(ticket, { headers: privateNoStoreResponseHeaders });
      }
      if (input.kind === "commit") {
        const current = await dependencies.loadBuild(context, projectId);
        if (current.id !== input.guard.buildId) {
          return json({ code: "PAGE_COPY_STALE" }, { status: 409 });
        }
        const build = await dependencies.loadRawBuild(
          context,
          input.guard.buildId
        );
        if (build.projectId !== projectId || build.deployment !== null) {
          return new Response(null, { status: 404 });
        }
        if (
          build.lastTransactionId === input.transactionId &&
          current.pages.pages.has(input.pageId)
        ) {
          return json(
            { version: build.version, pageId: input.pageId },
            { headers: privateNoStoreResponseHeaders }
          );
        }
        if (
          current.pages.pages.has(input.pageId) ||
          current.pages.folders.has(input.pageId) ||
          current.pages.pageTemplates?.has(input.pageId) === true ||
          current.version !== build.version ||
          !(await validatePageCopyGuard({
            guard: input.guard,
            context,
            projectId,
            buildId: input.guard.buildId,
            version: build.version,
            loadAssets: dependencies.loadAssets,
          }))
        ) {
          return json({ code: "PAGE_COPY_STALE" }, { status: 409 });
        }
        const { assets, assetFolders } = await dependencies.loadAssets(
          projectId,
          context,
          {
            skipPermissionsCheck: true,
          }
        );
        const mutation = await executeApiRuntimeMutation<{ id: string }>({
          id: "pageTransfer.insert",
          build: current,
          assets,
          assetFolders,
          input: { ...input.transfer, projectId },
          context: { createPageId: () => input.pageId },
        });
        if (
          mutation.result.id !== input.pageId ||
          mutation.payload.some(
            ({ namespace }) =>
              namespace === "assets" || namespace === "assetFolders"
          )
        ) {
          return json({ code: "PAGE_COPY_STALE" }, { status: 409 });
        }
        const result = await dependencies.patchBuild(
          {
            build,
            buildId: input.guard.buildId,
            projectId,
            clientVersion: input.guard.baseVersion,
            transactions: [
              { id: input.transactionId, payload: mutation.payload },
            ],
          },
          context
        );
        if (result.status !== "ok") {
          return json({ code: "PAGE_COPY_STALE" }, { status: 409 });
        }
        return json(
          { version: result.version, pageId: mutation.result.id },
          { headers: privateNoStoreResponseHeaders }
        );
      }
      const grant = await dependencies.readGrant(input.grant);
      if (
        grant === undefined ||
        input.assets.some(({ sourceId }) => !grant.assetIds.includes(sourceId))
      ) {
        return new Response(null, { status: 403 });
      }
      const [build, source, target, sourceIsCurrent] = await Promise.all([
        dependencies.loadBuild(context, projectId),
        dependencies.loadAssets(grant.projectId, context, {
          skipPermissionsCheck: true,
        }),
        dependencies.loadAssets(projectId, context, {
          skipPermissionsCheck: true,
        }),
        dependencies.isCurrentGrant(grant, context.postgrest.client),
      ]);
      if (!sourceIsCurrent || build.version !== input.expectedVersion) {
        return json({ code: "PAGE_COPY_STALE" }, { status: 409 });
      }
      const sourceAssets = new Map(
        source.assets.map((asset) => [asset.id, asset])
      );
      const targetAssets = new Map(
        target.assets.map((asset) => [asset.id, asset])
      );
      const targetFolders = new Map(
        target.assetFolders.map((folder) => [folder.id, folder])
      );
      const sourcePaths = createClipboardAssetPaths(
        source.assets,
        new Map(source.assetFolders.map((folder) => [folder.id, folder]))
      );
      const targetPaths = new Map(
        Object.entries(
          createClipboardAssetPaths(target.assets, targetFolders)
        ).map(([id, path]) => [path, id])
      );
      const created = [];
      const reused = [];
      for (const item of input.assets) {
        const sourceAsset = sourceAssets.get(item.sourceId);
        if (
          sourceAsset === undefined ||
          sourceAsset.name !== item.expectedName ||
          !matchesGrantedAssetRevisions(
            grant,
            [sourceAsset],
            source.assetFolders
          )
        ) {
          return json({ code: "PAGE_COPY_STALE" }, { status: 409 });
        }
        if (item.folderId !== undefined && !targetFolders.has(item.folderId)) {
          return json({ code: "PAGE_COPY_STALE" }, { status: 409 });
        }
        const existing = targetAssets.get(item.targetId);
        const alias = {
          ...sourceAsset,
          id: item.targetId,
          projectId,
          folderId: item.folderId,
        };
        const path = createClipboardAssetPaths([alias], targetFolders)[
          alias.id
        ];
        if (path !== sourcePaths[item.sourceId]) {
          return json({ code: "PAGE_COPY_ASSET_CONFLICT" }, { status: 409 });
        }
        if (existing !== undefined) {
          if (
            existing.name !== alias.name ||
            existing.filename !== alias.filename ||
            existing.description !== alias.description ||
            existing.folderId !== alias.folderId
          ) {
            return json({ code: "PAGE_COPY_ASSET_CONFLICT" }, { status: 409 });
          }
          reused.push(existing);
        } else {
          if (targetPaths.has(path)) {
            return json({ code: "PAGE_COPY_ASSET_CONFLICT" }, { status: 409 });
          }
          created.push(alias);
          targetAssets.set(alias.id, alias);
          targetPaths.set(path, alias.id);
        }
      }
      if (created.length > 0) {
        await dependencies.assertCapacity(projectId, context, created.length);
        await validateCollectionAssetPatch({
          current: new Map(target.assets.map((asset) => [asset.id, asset])),
          next: targetAssets,
          assetStore: dependencies.createAssetStore(),
          canBuild: true,
        });
        const result = await context.postgrest.client
          .from("Asset")
          .insert(createAssetRows(created, projectId));
        if (result.error) {
          throw result.error;
        }
      }
      return json(
        { created, reused },
        { headers: privateNoStoreResponseHeaders }
      );
    } catch (error) {
      return assetRestErrorResponse(error);
    }
  };

export const handlePageCopyRoute = createPageCopyDestinationAction();
