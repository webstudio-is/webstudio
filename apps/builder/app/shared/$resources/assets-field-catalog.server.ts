import { json } from "@remix-run/server-runtime";
import { loadBuilderAssetFieldCatalog } from "@webstudio-is/asset-uploader/index.server";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import { privateNoStoreResponseHeaders } from "~/services/cache-control.server";
import { createContext } from "../context.server";
import { isBuilder } from "../router-utils";
import { createAssetClient } from "../asset-client";

type Dependencies = {
  createContext: typeof createContext;
  createAssetClient: () => Pick<
    ReturnType<typeof createAssetClient>,
    "readFile"
  >;
  loadBuilderAssetFieldCatalog: typeof loadBuilderAssetFieldCatalog;
};

const defaultDependencies: Dependencies = {
  createContext,
  createAssetClient,
  loadBuilderAssetFieldCatalog,
};

export const loader = async (
  { request }: { request: Request },
  dependencies = defaultDependencies
) => {
  if (isBuilder(request) === false) {
    throw new Error(
      "Asset field catalog can only be accessed from the builder interface"
    );
  }

  const { projectId } = parseBuilderUrl(request.url);
  if (projectId === undefined) {
    throw new Error("Project ID is required to load the asset field catalog");
  }

  try {
    const context = await dependencies.createContext(request);
    const catalog = await dependencies.loadBuilderAssetFieldCatalog({
      projectId,
      context,
      assetClient: dependencies.createAssetClient(),
    });
    return json(catalog, { headers: privateNoStoreResponseHeaders });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "You don't have access to this asset field catalog",
            retryable: false,
          },
        },
        { status: 403, headers: privateNoStoreResponseHeaders }
      );
    }
    return json(
      {
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Asset field catalog failed",
          retryable: true,
        },
      },
      { status: 500, headers: privateNoStoreResponseHeaders }
    );
  }
};
