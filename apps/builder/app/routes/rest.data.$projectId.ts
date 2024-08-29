import type { LoaderFunctionArgs } from "@remix-run/server-runtime";
import { db } from "@webstudio-is/project/index.server";
import { loadDevBuildByProjectId } from "@webstudio-is/project-build/index.server";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import { createContext } from "~/shared/context.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);

  if (params.projectId === undefined) {
    throw new Error("Project id undefined");
  }
  const context = await createContext(request);
  const project = await db.project.loadById(params.projectId, context);
  if (project === null) {
    throw new Error(`Project "${params.projectId}" not found`);
  }
  if (project.userId === null) {
    throw new Error("Project must have project userId defined");
  }
  const build = await loadDevBuildByProjectId(context, project.id);
  const assets = await loadAssetsByProject(project.id, context);
  return {
    ...build,
    assets,
  };
};
