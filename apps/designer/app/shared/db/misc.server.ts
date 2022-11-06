import { db } from "@webstudio-is/project/server";

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

  const devBuild = await db.build.loadByProjectId(projectId, "dev");
  await db.build.create(project.id, "prod", devBuild);

  const updatedProject = await db.project.update({
    id: projectId,
    domain,
  });
  return updatedProject;
};
