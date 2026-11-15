import type { BrowserContext } from "@playwright/test";
import { measure } from "../perf";
import { prepareExistingContentModeProject } from "./content-mode-project";
import { createProjectThroughApi } from "./create-project";

type ContentModeProjectOptions = {
  context: BrowserContext;
  email?: string;
  title?: string;
  devPlan?: string;
  assetNamePrefix?: string;
  editorToken?: string;
  editorCanUseApi?: boolean;
  builderToken?: string;
};

export const createContentModeProject = async ({
  context,
  email = "content-mode-e2e@webstudio.test",
  title = "Content Mode E2E",
  devPlan,
  assetNamePrefix,
  editorToken,
  editorCanUseApi,
  builderToken,
}: ContentModeProjectOptions) => {
  const projectId = await measure(
    "content mode fixture login/create project",
    () => createProjectThroughApi({ context, email, title, devPlan })
  );

  return await measure("content mode fixture prepare project", async () => {
    return await prepareExistingContentModeProject({
      projectId,
      assetNamePrefix,
      editorToken,
      editorCanUseApi,
      builderToken,
    });
  });
};
