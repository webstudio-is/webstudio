import type { CanvasData, Project } from "@webstudio-is/project";
import { db as projectDb } from "@webstudio-is/project/server";
import { db as designTokensDb } from "@webstudio-is/design-tokens/server";
import { utils } from "@webstudio-is/project";
import { loadByProject } from "@webstudio-is/asset-uploader/server";

export const loadCanvasData = async (
  project: Project,
  env: "dev" | "prod",
  pageIdOrPath = ""
): Promise<CanvasData | undefined> => {
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

  const [tree, props, breakpoints, designTokens, assets] = await Promise.all([
    projectDb.tree.loadById(page.treeId),
    projectDb.props.loadByTreeId(page.treeId),
    projectDb.breakpoints.load(build.id),
    designTokensDb.load(build.id),
    loadByProject(project.id),
  ]);

  if (tree === null) {
    throw new Error(`Tree not found for project ${project.id}`);
  }

  if (breakpoints === null) {
    throw new Error(`Breakpoints not found for project ${project.id}`);
  }

  return {
    tree,
    props,
    breakpoints: breakpoints.values,
    designTokens,
    buildId: build.id,
    page,
    assets,
  };
};
