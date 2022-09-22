import { type Data } from "@webstudio-is/react-sdk";
import type { Project, Build } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/index.server";

export type CanvasData = Data & { buildId: Build["id"] };

export type ErrorData = {
  errors: string;
};

const loadData = async (projectId: Project["id"]) => {
  const project = await db.project.loadById(projectId);

  if (project === null) throw new Error(`Project "${projectId}" not found`);

  const devBuild = await db.build.loadByProjectId(projectId, "dev");

  // @todo: use a correct page rather than homePage
  const [tree, props, breakpoints] = await Promise.all([
    db.tree.loadById(devBuild.pages.homePage.treeId),
    db.props.loadByTreeId(devBuild.pages.homePage.treeId),
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
    buildId: devBuild.id,
    breakpoints: breakpoints.values,
    assets: project.assets ?? [],
  };
};

export const loadCanvasData = async ({
  projectId,
}: {
  projectId: Project["id"];
}): Promise<CanvasData | ErrorData> => {
  return await loadData(projectId);
};

export type PreviewData = Data;

export const loadPreviewData = async ({
  projectId,
}: {
  projectId: Project["id"];
}): Promise<PreviewData | ErrorData> => {
  const { tree, props, breakpoints, assets } = await loadData(projectId);
  return { tree, props, breakpoints, assets };
};
