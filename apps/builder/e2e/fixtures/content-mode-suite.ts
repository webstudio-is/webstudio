import type { BrowserContext, Page } from "@playwright/test";
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

const apiPages = new WeakMap<BrowserContext, Promise<Page>>();
const getApiPage = (context: BrowserContext) => {
  let page = apiPages.get(context);
  if (page === undefined) {
    page = (async () => {
      const page = await context.newPage();
      const originUrl = `${dashboardUrl}/__e2e_origin`;
      try {
        await page.route(originUrl, (route) =>
          route.fulfill({ contentType: "text/html", body: "<!doctype html>" })
        );
        await page.goto(originUrl);
        return page;
      } catch (error) {
        await page.close();
        throw error;
      }
    })();
    apiPages.set(context, page);
  }
  return page;
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
  const page = await getApiPage(context);
  await page.evaluate(
    async ({ email, devPlan, secret }) => {
      const loginPage = await fetch("/login");
      if (loginPage.ok === false) {
        throw new Error(`E2E login check failed with HTTP ${loginPage.status}`);
      }
      if (new URL(loginPage.url).pathname === "/login") {
        const login = await fetch("/auth/dev", {
          method: "POST",
          body: new URLSearchParams({ secret, email, devPlan }),
        });
        if (login.ok === false) {
          throw new Error(`E2E dev login failed with HTTP ${login.status}`);
        }
      }
    },
    {
      email: getWorkerEmail(email),
      devPlan: devPlan ?? "",
      secret: env.AUTH_SECRET,
    }
  );
  const csrf = await page.goto(`${dashboardUrl}/dashboard?_data=routes/_ui`, {
    waitUntil: "commit",
  });
  if (csrf === null || csrf.ok() === false) {
    throw new Error(`E2E CSRF setup failed with HTTP ${csrf?.status()}`);
  }
  const { csrfToken } = (await csrf.json()) as { csrfToken?: string };
  if (csrfToken === undefined || csrfToken === "") {
    throw new Error("E2E CSRF setup did not return a token");
  }
  return await page.evaluate(
    async ({ title, csrfToken }) => {
      const project = await fetch("/trpc/dashboardProject.create?batch=1", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ 0: { title } }),
      });
      if (project.ok === false) {
        throw new Error(
          `E2E project creation failed with HTTP ${project.status}`
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
    },
    { title, csrfToken }
  );
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
