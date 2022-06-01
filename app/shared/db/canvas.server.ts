import { type Data, type Project } from "@webstudio-is/sdk";
import * as db from ".";
import { ParsedProject } from "./project.server";

export type CanvasData = Data & { project: ParsedProject };

export type ErrorData = {
  errors: string;
};

const loadData = async (projectId: Project["id"]) => {
  const project = await db.project.loadById(projectId);

  if (project === null) throw new Error(`Project "${projectId}" not found`);

  const [tree, props, breakpoints] = await Promise.all([
    db.tree.loadByProject(project, "development"),
    db.props.loadByProject(project, "development"),
    db.breakpoints.load(project.devTreeId),
  ]);

  if (tree === null) {
    throw new Error(
      `Tree ${project.devTreeId} not found for project ${projectId}`
    );
  }

  if (breakpoints === null) {
    throw new Error(`Breakpoints not found for project ${projectId}`);
  }

  return {
    tree,
    props,
    project,
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
