import { loginAndCreateBlankProject } from "../flows/dashboard";
import { newPage } from "../harness";
import { measure } from "../perf";
import {
  prepareExistingContentModeProject,
  type SeededContentModeProject,
} from "./content-mode-project";

type ContentModeProjectOptions = {
  email?: string;
  title?: string;
};

let sharedProject: SeededContentModeProject | undefined;

export const createContentModeProject = async ({
  email = "content-mode-e2e@webstudio.test",
  title = "Content Mode E2E",
}: ContentModeProjectOptions = {}) => {
  const ownerPage = await newPage();

  try {
    const projectId = await measure(
      "content mode fixture login/create project",
      async () =>
        await loginAndCreateBlankProject({
          page: ownerPage,
          email,
          title,
        })
    );

    return await measure("content mode fixture prepare project", async () => {
      return await prepareExistingContentModeProject({ projectId });
    });
  } finally {
    await ownerPage.close();
  }
};

export const setupSharedContentModeProject = async (
  options?: ContentModeProjectOptions
) => {
  sharedProject = await createContentModeProject(options);
  return sharedProject;
};

export const getSharedContentModeProject = () => {
  if (sharedProject === undefined) {
    throw new Error("Expected shared content-mode project to be initialized");
  }

  return sharedProject;
};
