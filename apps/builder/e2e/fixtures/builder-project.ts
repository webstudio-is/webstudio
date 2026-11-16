import type { BrowserContext, Page } from "@playwright/test";
import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";
import { createProjectThroughApi } from "./create-project";

type Build = Awaited<ReturnType<typeof loadDevBuild>>;
type BuildUpdate = Omit<Parameters<typeof updateBuild>[1], "version">;

export const createSeededBuilderProject = async ({
  context,
  page,
  email,
  title,
  devPlan,
  builderToken,
  createBuildUpdate,
}: {
  context: BrowserContext;
  page?: Page;
  email: string;
  title: string;
  devPlan?: string;
  builderToken: string;
  createBuildUpdate: (build: Build) => BuildUpdate | Promise<BuildUpdate>;
}) => {
  const projectId = await createProjectThroughApi({
    context,
    page,
    email,
    title,
    devPlan,
  });
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
