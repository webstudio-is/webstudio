import { dashboardUrl, getProjectIdFromBuilderUrl } from "../harness";
import type { Page } from "playwright";

const loginReadyTimeout = 30_000;

export const loginWithSecret = async ({
  page,
  email,
  devPlan,
}: {
  page: Page;
  email: string;
  devPlan?: string;
}) => {
  if (devPlan !== undefined) {
    await page.context().clearCookies();
  }

  console.info("e2e: opening login");
  await page.goto(`${dashboardUrl}/login`);
  const loginWithSecretButton = page.getByRole("button", {
    name: "Login with Secret",
  });
  let loginState: "login" | "dashboard";
  try {
    loginState = await Promise.any([
      loginWithSecretButton
        .waitFor({ state: "visible", timeout: loginReadyTimeout })
        .then(() => "login" as const),
      page
        .waitForURL(`${dashboardUrl}/dashboard`, {
          timeout: loginReadyTimeout,
        })
        .then(() => "dashboard" as const),
    ]);
  } catch (error) {
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    throw new Error(
      `Expected login page or dashboard at ${page.url()}. Body: ${bodyText}`,
      { cause: error }
    );
  }
  if (loginState === "dashboard") {
    console.info("e2e: dashboard loaded");
    return;
  }
  await loginWithSecretButton.click();
  await page.getByPlaceholder("Auth secret").fill("test");
  await page.getByPlaceholder("Email (optional)").fill(email);
  if (devPlan !== undefined) {
    await page.locator('select[name="devPlan"]').selectOption(devPlan);
  }
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
  if (projectId === undefined) {
    throw new Error(`Expected builder URL, received ${page.url()}`);
  }
  return projectId;
};

export const loginAndCreateBlankProject = async ({
  page,
  email,
  title,
  devPlan,
}: {
  page: Page;
  email: string;
  title: string;
  devPlan?: string;
}) => {
  await loginWithSecret({ page, email, devPlan });
  return await createBlankProject({ page, title });
};
