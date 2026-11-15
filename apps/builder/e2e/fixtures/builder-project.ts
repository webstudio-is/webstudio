import type { BrowserContext } from "@playwright/test";
import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";
import { createProjectThroughApi } from "./create-project";

type Build = Awaited<ReturnType<typeof loadDevBuild>>;
type BuildUpdate = Omit<Parameters<typeof updateBuild>[1], "version">;

export const createSeededBuilderProject = async ({
  context,
  email,
  title,
  builderToken,
  createBuildUpdate,
}: {
  context: BrowserContext;
  email: string;
  title: string;
  builderToken: string;
  createBuildUpdate: (build: Build) => BuildUpdate | Promise<BuildUpdate>;
}) => {
  const projectId = await createProjectThroughApi({ context, email, title });
  const build = await loadDevBuild({ projectId });
  await updateBuild(build.id, {
    ...(await createBuildUpdate(build)),
    version: 0,
  });
  await insertAuthorizationToken({
    token: builderToken,
    projectId,
    name: "E2E builder token",
    relation: "builders",
  });
  return { projectId, builderToken };
};
