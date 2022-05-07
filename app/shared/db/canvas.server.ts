import { type Data, type Project } from "@webstudio-is/sdk";
import * as db from ".";

export type CanvasData = Data & { project: Project };

export type ErrorData = {
  errors: string;
};

const loadData = async (projectId: Project["id"]) => {
  const [breakpoints, project] = await Promise.all([
    db.breakpoints.load(projectId),
    db.project.loadById(projectId),
  ]);
  if (project === null) throw new Error(`Project "${projectId}" not found`);

  const [tree, props] = await Promise.all([
    db.tree.loadByProject(project, "development"),
    db.props.loadByProject(project, "development"),
  ]);
  return { tree, props, project, breakpoints: breakpoints?.values || [] };
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
