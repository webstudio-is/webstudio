import type { CanvasData, Project } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/server";
import { utils } from "@webstudio-is/project";

export const loadCanvasData = async (
  project: Project,
  env: "dev" | "prod",
  pageIdOrPath = ""
): Promise<CanvasData | undefined> => {
  const build =
    env === "dev"
      ? await db.build.loadByProjectId(project.id, "dev")
      : await db.build.loadByProjectId(project.id, "prod");

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const page = utils.pages.findByIdOrPath(build.pages, pageIdOrPath);

  if (page === undefined) {
    throw new Error(`Page ${pageIdOrPath} not found`);
  }

  const [tree, props, breakpoints, designTokens] = await Promise.all([
    db.tree.loadById(page.treeId),
    db.props.loadByTreeId(page.treeId),
    db.breakpoints.load(build.id),
    db.designTokens.load(build.id),
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
    assets: project.assets ?? [],
  };
};
