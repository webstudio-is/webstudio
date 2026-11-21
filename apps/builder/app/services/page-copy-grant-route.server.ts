import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/server-runtime";
import {
  loadAssetsByProjectWithClient,
  loadAssetFoldersByProjectWithClient,
} from "@webstudio-is/asset-uploader/server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/server";
import { z } from "zod";
import { publicApiContractVersion } from "@webstudio-is/protocol";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { authorizeApiProject, ensureApiCsrf } from "~/services/api-auth.server";
import {
  assetRestErrorResponse,
  parseAssetRestIdentifier,
  readAssetRestJson,
} from "~/services/asset-rest.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import {
  getPageCopyStorageScope,
  getGrantedAssetRevisions,
  matchesGrantedAssetRevisions,
  readPageCopyGrantForRenewal,
  loadPageCopyBuildIdentity,
  pageCopySourceInput,
  pageCopyGrantRequestBytes,
  signPageCopyGrant,
} from "~/services/page-copy-grant.server";

const authorizeSource = async (request: Request, projectId: string) => {
  const context = await authorizeApiProject(request, projectId, "view");
  if (
    !(await authorizeProject.hasProjectPermit(
      { projectId, permit: "view" },
      context
    ))
  ) {
    throw new Response(null, { status: 403, statusText: "Forbidden" });
  }
  return context;
};

export const loadPageCopyRoute = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);
  try {
    const projectId = parseAssetRestIdentifier(
      new URL(request.url).searchParams.get("projectId")
    );
    const context = await authorizeSource(request, projectId);
    const storageScope = getPageCopyStorageScope();
    if (storageScope === undefined) {
      return json({ code: "PAGE_COPY_SOURCE_UNSUPPORTED" }, { status: 501 });
    }
    const build = await loadPageCopyBuildIdentity(
      projectId,
      context.postgrest.client
    );
    if (build === null) {
      return new Response(null, { status: 404 });
    }
    return json(
      {
        storageScope,
        contractVersion: publicApiContractVersion,
        buildId: build.id,
        version: build.version,
      },
      { headers: privateNoStoreResponseHeaders }
    );
  } catch (error) {
    return assetRestErrorResponse(error);
  }
};

const pageCopyGrantInput = z.union([
  pageCopySourceInput
    .extend({
      expectedRevision: z
        .object({
          buildId: z.string(),
          version: z.number().int().nonnegative(),
        })
        .optional(),
    })
    .strict(),
  pageCopySourceInput
    .pick({ projectId: true, pageId: true })
    .extend({ renewGrant: z.string().min(1) })
    .strict(),
]);

const dependencies = {
  authorize: authorizeSource,
  checkCsrf: ensureApiCsrf,
  getStorageScope: getPageCopyStorageScope,
  readRenewal: readPageCopyGrantForRenewal,
  loadBuild: loadDevBuildByProjectId,
  loadAssets: loadAssetsByProjectWithClient,
  loadFolders: loadAssetFoldersByProjectWithClient,
  signGrant: signPageCopyGrant,
};

export const createPageCopyGrantAction =
  (deps = dependencies) =>
  async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
      return new Response(null, { status: 405 });
    }
    preventCrossOriginCookie(request);
    await deps.checkCsrf(request);
    try {
      const storageScope = deps.getStorageScope();
      if (storageScope === undefined) {
        return json({ code: "PAGE_COPY_UNSUPPORTED" }, { status: 501 });
      }
      let source;
      try {
        source = pageCopyGrantInput.parse(
          await readAssetRestJson(request, pageCopyGrantRequestBytes)
        );
      } catch {
        return json({ code: "PAGE_COPY_INVALID_INPUT" }, { status: 400 });
      }
      const context = await deps.authorize(request, source.projectId);
      const old =
        "renewGrant" in source
          ? await deps.readRenewal(source.renewGrant)
          : undefined;
      if (
        "renewGrant" in source &&
        (old?.projectId !== source.projectId || old.pageId !== source.pageId)
      ) {
        return json({ code: "PAGE_COPY_RECOPY_REQUIRED" }, { status: 409 });
      }
      const assetIds =
        "assetIds" in source ? [...new Set(source.assetIds)] : old!.assetIds;
      const [build, assets, folders] = await Promise.all([
        deps.loadBuild(context, source.projectId),
        deps.loadAssets(source.projectId, context.postgrest.client, assetIds),
        deps.loadFolders(source.projectId, context.postgrest.client),
      ]);
      if (
        build.pages.pages.has(source.pageId) === false ||
        assets.length !== assetIds.length
      ) {
        return new Response(null, { status: 404 });
      }
      if (
        old !== undefined &&
        (old.buildId !== build.id ||
          old.version !== build.version ||
          !matchesGrantedAssetRevisions(old, assets, folders))
      ) {
        return json({ code: "PAGE_COPY_RECOPY_REQUIRED" }, { status: 409 });
      }
      if (
        "expectedRevision" in source &&
        source.expectedRevision !== undefined &&
        (source.expectedRevision.buildId !== build.id ||
          source.expectedRevision.version !== build.version)
      ) {
        return json({ code: "PAGE_COPY_SOURCE_STALE" }, { status: 409 });
      }
      const grant = await deps.signGrant({
        projectId: source.projectId,
        pageId: source.pageId,
        assetRevisions: getGrantedAssetRevisions(assets, folders),
        buildId: build.id,
        version: build.version,
      });
      if (
        grant === undefined ||
        grant.length > pageCopyGrantRequestBytes - 2048
      ) {
        return json({ code: "PAGE_COPY_SOURCE_UNSUPPORTED" }, { status: 413 });
      }
      return json(
        {
          grant,
          buildId: build.id,
          version: build.version,
          storageScope,
        },
        { headers: privateNoStoreResponseHeaders }
      );
    } catch (error) {
      return assetRestErrorResponse(error);
    }
  };

export const handlePageCopyRoute = createPageCopyGrantAction();
