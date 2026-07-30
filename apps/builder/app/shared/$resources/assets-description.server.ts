import { loadBuilderAssetFieldCatalog } from "@webstudio-is/asset-uploader/server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import {
  authorizeApiProject,
  getApiAuthorizationFailure,
} from "~/services/api-auth.server";
import { getAssetRestProjectId } from "~/services/asset-rest.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { createAssetClient } from "../asset-client";
import { createAssetResourceFailureResponse } from "./assets-response.server";

type AssetDescriptionDependencies = {
  authorizeApiProject: typeof authorizeApiProject;
  createAssetClient: () => Pick<
    ReturnType<typeof createAssetClient>,
    "readFile"
  >;
  loadBuilderAssetFieldCatalog: typeof loadBuilderAssetFieldCatalog;
  preventCrossOriginCookie: typeof preventCrossOriginCookie;
};

const defaultDependencies: AssetDescriptionDependencies = {
  authorizeApiProject,
  createAssetClient,
  loadBuilderAssetFieldCatalog,
  preventCrossOriginCookie,
};

type AssetDescriptionContext = {
  projectId: string;
  loadFieldCatalog: () => ReturnType<typeof loadBuilderAssetFieldCatalog>;
};

const createAssetDescriptionLoaderCore =
  <Value>({
    createValue,
    contentType,
  }: {
    createValue: (context: AssetDescriptionContext) => Value | Promise<Value>;
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
      return createAssetResourceFailureResponse({
        code: "INVALID_REQUEST",
        message: "Project ID is required to describe project assets",
        status: 400,
      });
    }

    try {
      const authorization = await dependencies.authorizeApiProject(
        request,
        projectId,
        "view"
      );
      const value = await createValue({
        projectId,
        loadFieldCatalog: () =>
          dependencies.loadBuilderAssetFieldCatalog({
            projectId,
            context: authorization,
            assetClient: dependencies.createAssetClient(),
          }),
      });
      return new Response(JSON.stringify(value), {
        headers: {
          ...privateNoStoreResponseHeaders,
          "content-type": contentType ?? "application/json; charset=utf-8",
        },
      });
    } catch (error) {
      const authorizationFailure = getApiAuthorizationFailure(error);
      if (authorizationFailure !== undefined) {
        return createAssetResourceFailureResponse(authorizationFailure);
      }
      return createAssetResourceFailureResponse({
        code: "INTERNAL_ERROR",
        message: "Project asset API description failed",
        status: 500,
        retryable: true,
      });
    }
  };

export const createAssetDescriptionLoader = <Value>({
  createValue,
  contentType,
}: {
  createValue: (
    catalog: Awaited<ReturnType<typeof loadBuilderAssetFieldCatalog>>,
    context: { projectId: string }
  ) => Value;
  contentType?: string;
}) =>
  createAssetDescriptionLoaderCore({
    contentType,
    createValue: async ({ projectId, loadFieldCatalog }) =>
      createValue(await loadFieldCatalog(), { projectId }),
  });

export const createStaticAssetDescriptionLoader = <Value>({
  createValue,
  contentType,
}: {
  createValue: (context: { projectId: string }) => Value;
  contentType?: string;
}) =>
  createAssetDescriptionLoaderCore({
    contentType,
    createValue: ({ projectId }) => createValue({ projectId }),
  });
