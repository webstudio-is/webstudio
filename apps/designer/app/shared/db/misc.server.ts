import { uploadAsset } from "@webstudio-is/asset-uploader";
import * as db from "./";

export const uploadAssets = uploadAsset;

/**
 * Conceptually publishing is cloning all data that affects user site
 * and referencing it under a new tree id.
 */
export const publish = async ({
  projectId,
  domain,
}: {
  projectId: string | null;
  domain: string | null;
}) => {
  if (projectId === null) {
    throw new Error("Project ID required");
  }
  if (domain === null) {
    throw new Error("Domain required");
  }

  const project = await db.project.loadById(projectId);
  if (project === null) {
    throw new Error(`Project "${projectId}" not found`);
  }

  const tree = await db.tree.clone(project.devTreeId);
  await db.props.clone({
    previousTreeId: project.devTreeId,
    nextTreeId: tree.id,
  });
  await db.breakpoints.clone({
    previousTreeId: project.devTreeId,
    nextTreeId: tree.id,
  });
  const prodTreeIdHistory = project.prodTreeIdHistory;
  if (project.prodTreeId) {
    prodTreeIdHistory.push(project.prodTreeId);
  }
  const updatedProject = await db.project.update({
    id: projectId,
    domain,
    prodTreeId: tree.id,
    prodTreeIdHistory,
  });
  return updatedProject;
};
