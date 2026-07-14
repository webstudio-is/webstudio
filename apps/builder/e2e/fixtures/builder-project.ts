import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";
import { loginAndCreateBlankProject } from "../flows/dashboard";
import { newPage } from "../harness";

type Build = Awaited<ReturnType<typeof loadDevBuild>>;
type BuildUpdate = Omit<Parameters<typeof updateBuild>[1], "version">;

export const createSeededBuilderProject = async ({
  email,
  title,
  builderToken,
  createBuildUpdate,
}: {
  email: string;
  title: string;
  builderToken: string;
  createBuildUpdate: (build: Build) => BuildUpdate | Promise<BuildUpdate>;
}) => {
  const page = await newPage();
  try {
    const projectId = await loginAndCreateBlankProject({ page, email, title });
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
  } finally {
    await page.close();
  }
};
