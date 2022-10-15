import { type Data } from "@webstudio-is/react-sdk";
import type { Project, Build, Page } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/index.server";
import { utils } from "@webstudio-is/project";

export type CanvasData = Data & { buildId: Build["id"]; page: Page };

export const loadCanvasData = async (
  projectId: Project["id"],
  env: "dev" | "prod",
  pagePath = ""
): Promise<CanvasData | undefined> => {
  const build =
    env === "dev"
      ? await db.build.loadByProjectId(projectId, "dev")
      : await db.build.loadByProjectId(projectId, "prod");

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
    throw new Error(`Tree not found for project ${projectId}`);
  }

  if (breakpoints === null) {
    throw new Error(`Breakpoints not found for project ${projectId}`);
  }

  return {
    tree,
    props,
    breakpoints: breakpoints.values,
    buildId: build.id,
    page,
  };
};
