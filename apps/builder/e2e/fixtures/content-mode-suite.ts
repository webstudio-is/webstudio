import type { BrowserContext } from "@playwright/test";
import { loginAndCreateBlankProject } from "../flows/dashboard";
import { measure } from "../perf";
import { prepareExistingContentModeProject } from "./content-mode-project";

type ContentModeProjectOptions = {
  context: BrowserContext;
  email?: string;
  title?: string;
  devPlan?: string;
  assetNamePrefix?: string;
  editorToken?: string;
  builderToken?: string;
};

export const createContentModeProject = async ({
  context,
  email = "content-mode-e2e@webstudio.test",
  title = "Content Mode E2E",
  devPlan,
  assetNamePrefix,
  editorToken,
  builderToken,
}: ContentModeProjectOptions) => {
  const ownerPage = await context.newPage();

  try {
    const projectId = await measure(
      "content mode fixture login/create project",
      async () =>
        await loginAndCreateBlankProject({
          page: ownerPage,
          email,
          title,
          devPlan,
        })
    );

    return await measure("content mode fixture prepare project", async () => {
      return await prepareExistingContentModeProject({
        projectId,
        assetNamePrefix,
        editorToken,
        builderToken,
      });
    });
  } finally {
    await ownerPage.close();
  }
};
