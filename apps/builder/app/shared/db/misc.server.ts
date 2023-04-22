import { db } from "@webstudio-is/project/index.server";
import { prisma } from "@webstudio-is/prisma-client";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  createBuild,
  loadBuildByProjectId,
} from "@webstudio-is/project-build/index.server";

/**
 * Conceptually publishing is cloning all data that affects user site
 * and referencing it under a new tree id.
 */
export const publish = async (
  {
    projectId,
    domain,
  }: {
    projectId: string | null;
    domain: string | null;
  },
  context: AppContext
) => {
  if (projectId === null) {
    throw new Error("Project ID required");
  }
  if (domain === null) {
    throw new Error("Domain required");
  }

  const project = await db.project.loadById(projectId, context);
  if (project === null) {
    throw new Error(`Project "${projectId}" not found`);
  }

  const devBuild = await loadBuildByProjectId(projectId, "dev");

  await prisma.$transaction(async (client) => {
    await createBuild(
      { projectId: project.id, env: "prod", sourceBuild: devBuild },
      context,
      client
    );
  });

  const updatedProject = await db.project.updateDomain(
    {
      id: projectId,
      domain,
    },
    context
  );
  return updatedProject;
};
