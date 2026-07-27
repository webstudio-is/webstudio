import { json } from "@remix-run/server-runtime";
import { loadBuilderAssetFieldCatalog } from "@webstudio-is/asset-uploader/server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { authorizeAssetRestProject } from "~/services/asset-rest-auth.server";
import { getAssetRestProjectId } from "~/services/asset-rest.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { createAssetClient } from "../asset-client";

export type AssetDescriptionDependencies = {
  authorizeAssetRestProject: typeof authorizeAssetRestProject;
  createAssetClient: () => Pick<
    ReturnType<typeof createAssetClient>,
    "readFile"
  >;
  loadBuilderAssetFieldCatalog: typeof loadBuilderAssetFieldCatalog;
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
};

const defaultDependencies: AssetDescriptionDependencies = {
  authorizeAssetRestProject,
  createAssetClient,
  loadBuilderAssetFieldCatalog,
  preventCrossOriginCookie,
};

const failure = ({
  code,
  message,
  status,
  retryable = false,
}: {
  code: "INVALID_REQUEST" | "FORBIDDEN" | "INTERNAL_ERROR";
  message: string;
  status: number;
  retryable?: boolean;
}) =>
  json(
    { ok: false, error: { code, message, retryable } },
    { status, headers: privateNoStoreResponseHeaders }
  );

export const createAssetDescriptionLoader =
  <Value>({
    createValue,
    contentType,
  }: {
    createValue: (
      catalog: Awaited<ReturnType<typeof loadBuilderAssetFieldCatalog>>
    ) => Value;
    contentType?: string;
  }) =>
  async (
    { request }: { request: Request },
    dependencies: AssetDescriptionDependencies = defaultDependencies
  ) => {
    dependencies.preventCrossOriginCookie(request);
    let projectId: string;
    try {
      projectId = getAssetRestProjectId(request);
    } catch {
      return failure({
        code: "INVALID_REQUEST",
        message: "Project ID is required to describe project assets",
        status: 400,
      });
    }

    try {
      const context = await dependencies.authorizeAssetRestProject(
        request,
        projectId,
        "view"
      );
      const catalog = await dependencies.loadBuilderAssetFieldCatalog({
        projectId,
        context,
        assetClient: dependencies.createAssetClient(),
      });
      return new Response(JSON.stringify(createValue(catalog)), {
        headers: {
          ...privateNoStoreResponseHeaders,
          "content-type": contentType ?? "application/json; charset=utf-8",
        },
      });
    } catch (error) {
      if (error instanceof AuthorizationError) {
        return failure({
          code: "FORBIDDEN",
          message: "You don't have access to this project's asset API",
          status: 403,
        });
      }
      return failure({
        code: "INTERNAL_ERROR",
        message: "Project asset API description failed",
        status: 500,
        retryable: true,
      });
    }
  };
