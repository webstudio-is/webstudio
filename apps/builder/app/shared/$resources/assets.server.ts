import { json } from "@remix-run/server-runtime";
import { parseBuilderUrl } from "@webstudio-is/protocol";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import {
  loadAssetResource,
  toAssetResourceItem,
} from "@webstudio-is/sdk/runtime";
import { isBuilder } from "../router-utils";
import { createContext } from "../context.server";

/**
 * System Resource that provides the list of assets for the current project.
 * This allows assets to be dynamically referenced in the builder using the expression editor.
 */
export const loader = async ({
  request,
  resourceUrl = request.url,
}: {
  request: Request;
  resourceUrl?: string;
}) => {
  if (isBuilder(request) === false) {
    throw new Error(
      "Asset resource loader can only be accessed from the builder interface"
    );
  }

  const { projectId } = parseBuilderUrl(request.url);

  if (projectId === undefined) {
    throw new Error(
      "Project ID is required to load assets. Ensure the request includes a valid project context."
    );
  }

  const context = await createContext(request);

  const assets = await loadAssetsByProject(projectId, context);

  const requestUrl = new URL(request.url);
  const origin = `${requestUrl.protocol}//${requestUrl.host}`;

  const assetsById = Object.fromEntries(
    assets.map((asset) => [asset.id, toAssetResourceItem(asset, origin)])
  );

  return json(
    await loadAssetResource({
      assets: assetsById,
      requestUrl: resourceUrl,
      fetchAsset: (url) => fetch(new URL(url, origin)),
    })
  );
};
