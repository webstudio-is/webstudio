import { json } from "@remix-run/server-runtime";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { isBuilder } from "../router-utils";
import { createContext } from "../context.server";

/**
 * System Resource that provides the list of assets for the current project.
 * This allows assets to be dynamically referenced in the builder using the expression editor.
 */
export const loader = async ({ request }: { request: Request }) => {
  if (isBuilder(request) === false) {
    throw new Error("Only builder requests are allowed");
  }

  const { projectId } = parseBuilderUrl(request.url);

  if (projectId === undefined) {
    throw new Error("projectId is required");
  }

  const context = await createContext(request);

  const assets = await loadAssetsByProject(projectId, context);

  return json(assets);
};
