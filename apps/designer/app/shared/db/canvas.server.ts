import { type Data } from "@webstudio-is/react-sdk";
import type { Project, Build, Page } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/index.server";
import { utils } from "@webstudio-is/project";

export type CanvasData = Data & { buildId: Build["id"]; page: Page };

export const loadCanvasData = async (
  projectId: Project["id"],
  pageId?: Page["id"]
): Promise<CanvasData> => {
  const project = await db.project.loadById(projectId);

  if (project === null) throw new Error(`Project "${projectId}" not found`);

  const devBuild = await db.build.loadByProjectId(projectId, "dev");

  const page =
    pageId === undefined
      ? devBuild.pages.homePage
      : utils.pages.findById(devBuild.pages, pageId);

  if (page === undefined) {
    throw new Error(`Page "${pageId}" not found`);
  }

  const [tree, props, breakpoints] = await Promise.all([
    db.tree.loadById(page.treeId),
    db.props.loadByTreeId(page.treeId),
    db.breakpoints.load(devBuild.id),
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
    buildId: devBuild.id,
    page,
    assets: project.assets ?? [],
  };
};
