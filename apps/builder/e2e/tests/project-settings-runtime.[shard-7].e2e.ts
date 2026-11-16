import type { Page as PlaywrightPage } from "@playwright/test";
import { parseProjectAuthRoutes } from "@webstudio-is/project-build/contracts";
import { updateProject } from "../db";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  createPageFromTemplate,
  openPage,
  openPageSettings,
} from "../flows/pages-panel";
import {
  getPersistedPages,
  getPersistedProjectSettings,
  openProjectSettings,
} from "../flows/project-settings-runtime";
import { waitForChangeToBeSaved } from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { test } from "../test";
import { measure } from "../perf";

const getPersistedPageByName = async ({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) => {
  const pages = await getPersistedPages({ projectId });
  const page = pages.pages.find((page) => page.name === name);
  if (page === undefined) {
    throw new Error(`Expected persisted page "${name}"`);
  }
  return page;
};

const deleteBasicAuth = async ({
  page,
  route,
}: {
  page: PlaywrightPage;
  route: string;
}) => {
  await page.getByText(route, { exact: true }).hover();
  const save = waitForChangeToBeSaved({ page });
  await page
    .getByRole("button", { name: `Delete authentication for ${route}` })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await save;
};

const expectPersistedBasicAuth = async ({
  projectId,
  route,
  login,
  exists,
}: {
  projectId: string;
  route: string;
  login: string;
  exists: boolean;
}) => {
  const settings = await getPersistedProjectSettings({ projectId });
  const routes = parseProjectAuthRoutes(settings.meta.auth ?? undefined).routes;
  const authRoute = routes.find((authRoute) => authRoute.route === route);
  if (exists === false) {
    if (authRoute !== undefined) {
      throw new Error(`Expected auth route ${route} to be deleted.`);
    }
    return;
  }
  if (authRoute?.auth.login !== login) {
    throw new Error(
      `Expected auth route ${route} for ${login}. Received ${JSON.stringify(routes)}`
    );
  }
};

test("Marketplace page settings and project authentication routes persist after reload", async ({
  page,
  context,
}) => {
  const email = "marketplace-page-settings-runtime@webstudio.test";
  const fixture = await createContentModeProject({
    context,
    email,
    title: "Marketplace Page Settings Runtime",
    assetNamePrefix: "marketplace-page-settings-runtime-",
    editorToken: "marketplace-page-settings-runtime-editor-token",
    builderToken: "marketplace-page-settings-runtime-builder-token",
  });
  const pageName = "Marketplace Runtime Page";
  const category = "Runtime Examples";
  const route = "/private";
  const login = "editor";
  const password = "e2e-secret";

  await updateProject(fixture.projectId, {
    marketplaceApprovalStatus: "PENDING",
  });

  await measure("marketplace page settings open builder", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForCanvasText({ page, text: "Initial content" });
  });

  await measure("project auth runtime add route", async () => {
    await openProjectSettings({ page });
    await page.getByRole("option", { name: "Authentication" }).click();
    await page.getByPlaceholder("/private or /docs/*").fill("private");
    await page.getByPlaceholder("Login").fill(login);
    await page.getByPlaceholder("Password").fill(password);
    if (
      (await page.getByRole("button", { name: "Add" }).isDisabled()) === false
    ) {
      throw new Error("Expected invalid auth route to disable Add.");
    }
    await page.getByPlaceholder("/private or /docs/*").fill(route);
    const save = waitForChangeToBeSaved({ page });
    await page.getByRole("button", { name: "Add" }).click();
    await save;
  });
  await expectPersistedBasicAuth({
    projectId: fixture.projectId,
    route,
    login,
    exists: true,
  });
  await page
    .getByRole("dialog", { name: "Project settings" })
    .getByRole("button", { name: "Close", exact: true })
    .click();

  await measure("marketplace page settings create page", async () => {
    await createPageFromTemplate({
      page,
      templateName: fixture.pageTemplateName,
      pageName,
      canvasText: fixture.pageTemplateText,
    });
  });

  await measure(
    "marketplace page settings update marketplace fields",
    async () => {
      await openPageSettings({ page, pageName });
      const includeSave = waitForChangeToBeSaved({ page });
      await page.getByLabel("Include in the marketplace").click();
      await includeSave;

      const categorySave = waitForChangeToBeSaved({ page });
      await page.getByLabel("Category").fill(category);
      await page.getByLabel("Category").blur();
      await categorySave;
    }
  );

  let persistedPage = await getPersistedPageByName({
    projectId: fixture.projectId,
    name: pageName,
  });
  if (
    persistedPage.marketplace?.include !== true ||
    persistedPage.marketplace.category !== category
  ) {
    throw new Error(
      `Expected marketplace settings to persist. Received ${JSON.stringify(
        persistedPage.marketplace
      )}`
    );
  }

  await measure("marketplace page settings reload builder", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await openPage({
      page,
      pageName,
      canvasText: fixture.pageTemplateText,
    });
  });
  await openPageSettings({ page, pageName });
  if (
    (await page.getByLabel("Include in the marketplace").isChecked()) === false
  ) {
    throw new Error("Expected marketplace include switch to stay checked");
  }
  const categoryValue = await page.getByLabel("Category").inputValue();
  if (categoryValue !== category) {
    throw new Error(
      `Expected marketplace category "${category}", received "${categoryValue}"`
    );
  }
  persistedPage = await getPersistedPageByName({
    projectId: fixture.projectId,
    name: pageName,
  });
  if (
    persistedPage.marketplace?.include !== true ||
    persistedPage.marketplace.category !== category
  ) {
    throw new Error(
      `Expected reload to preserve marketplace settings. Received ${JSON.stringify(
        persistedPage.marketplace
      )}`
    );
  }

  await page
    .getByRole("group", { name: `Page ${pageName}`, exact: true })
    .getByRole("button", { name: "Close page settings" })
    .click();
  await openProjectSettings({ page });
  await page.getByRole("option", { name: "Authentication" }).click();
  await page.getByText(route, { exact: true }).waitFor();
  await page.getByText(login, { exact: true }).waitFor();

  await measure("project auth runtime delete route", async () => {
    await deleteBasicAuth({ page, route });
  });
  await expectPersistedBasicAuth({
    projectId: fixture.projectId,
    route,
    login,
    exists: false,
  });
});
