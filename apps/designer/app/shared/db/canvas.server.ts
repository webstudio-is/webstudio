import type { CanvasData, Project } from "@webstudio-is/project";
import { db as projectDb } from "@webstudio-is/project/server";
import { utils } from "@webstudio-is/project";
import { loadByProject } from "@webstudio-is/asset-uploader/server";

export const loadCanvasData = async (
  project: Project,
  env: "dev" | "prod",
  pageIdOrPath = ""
): Promise<CanvasData> => {
  const build =
    env === "dev"
      ? await projectDb.build.loadByProjectId(project.id, "dev")
      : await projectDb.build.loadByProjectId(project.id, "prod");

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const page = utils.pages.findByIdOrPath(build.pages, pageIdOrPath);

  if (page === undefined) {
    throw new Error(`Page ${pageIdOrPath} not found`);
  }

  const [tree, assets] = await Promise.all([
    projectDb.tree.loadById(page.treeId),
    loadByProject(project.id),
  ]);

  if (tree === null) {
    throw new Error(`Tree not found for project ${project.id}`);
  }

  return {
    build,
    tree,
    buildId: build.id,
    page,
    assets,
  };
};
