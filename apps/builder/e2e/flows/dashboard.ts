import { assert, dashboardUrl, getProjectIdFromBuilderUrl } from "../harness";
import type { Page } from "playwright";

export const loginWithSecret = async ({
  page,
  email,
}: {
  page: Page;
  email: string;
}) => {
  console.info("e2e: opening login");
  await page.goto(`${dashboardUrl}/login`);
  await page.getByRole("button", { name: "Login with Secret" }).click();
  await page.getByPlaceholder("Auth secret").fill("test");
  await page.getByPlaceholder("Email (optional)").fill(email);
  console.info("e2e: submitting dev login");
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL(`${dashboardUrl}/dashboard`);
  console.info("e2e: dashboard loaded");
};

export const createBlankProject = async ({
  page,
  title,
}: {
  page: Page;
  title: string;
}) => {
  const createProjectButton = page.getByRole("button", {
    name: /Create a blank project|New project/,
  });
  try {
    await createProjectButton.waitFor({ state: "visible", timeout: 10_000 });
  } catch (error) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    throw new Error(
      `Expected dashboard create-project button at ${page.url()}. Body: ${bodyText}`,
      { cause: error }
    );
  }

  console.info("e2e: opening create project dialog");
  await createProjectButton.click();
  await page.getByPlaceholder("My Project").fill(title);
  console.info("e2e: submitting create project");
  await page.getByRole("button", { name: "Create Project" }).click();
  await page.waitForURL(/https:\/\/p-[^.]+\.wstd\.dev:\d+\//);
  console.info(`e2e: created project at ${page.url()}`);

  const projectId = getProjectIdFromBuilderUrl(page.url());
  assert(
    projectId !== undefined,
    `Expected builder URL, received ${page.url()}`
  );
  return projectId;
};

export const loginAndCreateBlankProject = async ({
  page,
  email,
  title,
}: {
  page: Page;
  email: string;
  title: string;
}) => {
  await loginWithSecret({ page, email });
  return await createBlankProject({ page, title });
};
