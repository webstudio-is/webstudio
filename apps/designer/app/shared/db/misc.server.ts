import { db } from "@webstudio-is/project";

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

  // should not happen
  if (project.devBuild == undefined) {
    throw new Error(`project.devBuild is not loaded`);
  }

  await db.build.createProd(project.devBuild, project.id);

  const updatedProject = await db.project.update({
    id: projectId,
    domain,
  });
  return updatedProject;
};
