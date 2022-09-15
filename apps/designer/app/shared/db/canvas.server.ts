import { type Data } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project";
import type { Project, Build } from "@webstudio-is/project";
export type CanvasData = Data & { buildId: Build["id"] };

export type ErrorData = {
  errors: string;
};

const loadData = async (projectId: Project["id"]) => {
  const project = await db.project.loadById(projectId);

  if (project === null) throw new Error(`Project "${projectId}" not found`);

  const devBuild = await db.build.loadByProjectId(projectId, "dev");

  const [tree, props, breakpoints] = await Promise.all([
    db.tree.loadById(devBuild.pages.homePage.treeId),
    db.props.loadByTreeId(devBuild.pages.homePage.treeId),
    db.breakpoints.load(devBuild.pages.homePage.treeId),
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
  const { tree, props, breakpoints } = await loadData(projectId);
  return { tree, props, breakpoints };
};
