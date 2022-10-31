import { type Data } from "@webstudio-is/react-sdk";
import type { Project, Build, Page } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/index.server";
import { utils } from "@webstudio-is/project";

export type CanvasData = Data & { buildId: Build["id"]; page: Page };

export const loadCanvasData = async (
  project: Project,
  env: "dev" | "prod",
  pagePath = ""
): Promise<CanvasData | undefined> => {
  const build =
    env === "dev"
      ? await db.build.loadByProjectId(project.id, "dev")
      : await db.build.loadByProjectId(project.id, "prod");

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const page = utils.pages.findByPath(build.pages, pagePath);

  if (page === undefined) {
    return;
  }

  const [tree, props, breakpoints] = await Promise.all([
    db.tree.loadById(page.treeId),
    db.props.loadByTreeId(page.treeId),
    db.breakpoints.load(build.id),
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
    buildId: build.id,
    page,
    assets: project.assets ?? [],
  };
};
