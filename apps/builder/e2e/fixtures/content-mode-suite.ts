import type { BrowserContext } from "@playwright/test";
import env from "../../app/env/env.server";
import { getWorkerEmail } from "../flows/dashboard";
import { measure } from "../perf";
import { dashboardUrl } from "../test";
import { prepareExistingContentModeProject } from "./content-mode-project";

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

const createProjectThroughApi = async ({
  context,
  email,
  title,
  devPlan,
}: {
  context: BrowserContext;
  email: string;
  title: string;
  devPlan?: string;
}) => {
  if (env.AUTH_SECRET === undefined) {
    throw new Error("AUTH_SECRET must be set for e2e dev login");
  }
  if (devPlan !== undefined) {
    await context.clearCookies();
  }
  const loginPage = await context.request.get(`${dashboardUrl}/login`, {
    headers: {
      "sec-fetch-mode": "navigate",
      "sec-fetch-dest": "document",
      "sec-fetch-site": "same-origin",
    },
    maxRedirects: 0,
  });
  if (loginPage.status() === 200) {
    const login = await context.request.post(`${dashboardUrl}/auth/dev`, {
      form: {
        secret: env.AUTH_SECRET,
        email: getWorkerEmail(email),
        devPlan: devPlan ?? "",
      },
      headers: { "sec-fetch-site": "same-origin" },
      maxRedirects: 0,
    });
    if (login.status() !== 302) {
      throw new Error(`E2E dev login failed with HTTP ${login.status()}`);
    }
  } else if (loginPage.status() !== 302) {
    throw new Error(`E2E login check failed with HTTP ${loginPage.status()}`);
  }

  const csrf = await context.request.get(
    `${dashboardUrl}/dashboard?_data=routes/_ui`,
    {
      headers: {
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
      },
    }
  );
  if (csrf.ok() === false) {
    throw new Error(`E2E CSRF setup failed with HTTP ${csrf.status()}`);
  }
  const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
  if (csrfToken === undefined || csrfToken === "") {
    throw new Error("E2E CSRF setup did not return a token");
  }

  const project = await context.request.post(
    `${dashboardUrl}/trpc/dashboardProject.create?batch=1`,
    {
      data: { 0: { title } },
      headers: {
        "sec-fetch-site": "same-origin",
        "x-csrf-token": csrfToken,
      },
    }
  );
  if (project.ok() === false) {
    throw new Error(
      `E2E project creation failed with HTTP ${project.status()}`
    );
  }
  const result = (await project.json()) as Array<{
    result?: { data?: { id?: string } };
  }>;
  const projectId = result[0]?.result?.data?.id;
  if (projectId === undefined) {
    throw new Error("E2E project creation did not return a project ID");
  }
  return projectId;
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
