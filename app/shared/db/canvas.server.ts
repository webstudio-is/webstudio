import { type Data, initialBreakpoints, type Project } from "@webstudio-is/sdk";
import * as db from ".";

export type CanvasData = Data & { project: Project };

export type ErrorData = {
  errors: string;
};

const loadData = async ({ projectId }: { projectId: string }) => {
  const project = await db.project.loadById(projectId);
  if (project === null) throw new Error(`Project "${projectId}" not found`);
  const [tree, props] = await Promise.all([
    db.tree.loadByProject(project, "development"),
    db.props.loadByProject(project, "development"),
  ]);
  // @todo fetch breakpoints from db
  return { tree, props, project, breakpoints: initialBreakpoints };
};

export const loadCanvasData = async ({
  projectId,
}: {
  projectId: string;
}): Promise<CanvasData | ErrorData> => {
  return await loadData({ projectId });
};

export type PreviewData = Data;

export const loadPreviewData = async ({
  projectId,
}: {
  projectId: string;
}): Promise<PreviewData | ErrorData> => {
  const { tree, props, breakpoints } = await loadData({ projectId });
  return { tree, props, breakpoints };
};
