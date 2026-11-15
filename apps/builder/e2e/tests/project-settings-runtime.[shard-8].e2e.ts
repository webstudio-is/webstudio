import type { Page as PlaywrightPage } from "@playwright/test";
import type { Page as WebstudioPage } from "@webstudio-is/sdk";
import { parseProjectAuthRoutes } from "@webstudio-is/project-build/contracts";
import { loadDevBuild, updateProject } from "../db";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  createPageFromTemplate,
  openPage,
  openPageSettings,
} from "../flows/pages-panel";
import { waitForChangeToBeSaved } from "../flows/sync-status";
import {
  expectGeneratedAppRedirect,
  expectGeneratedRedirects,
} from "../flows/generated-app";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { e2eEmailPlanName } from "../plans";
import { test } from "../test";
import { measure } from "../perf";

test.describe.configure({ mode: "parallel" });

type PersistedPages = {
  redirects?: Array<{
    old: string;
    new: string;
    status?: string;
  }>;
  pages: WebstudioPage[];
};

type PersistedProjectSettings = {
  compiler: { atomicStyles?: boolean };
  meta: {
    auth?: string | null;
    siteName?: string;
    contactEmail?: string;
    emailSender?: string;
  };
};

const getPersistedPages = async ({ projectId }: { projectId: string }) => {
  const build = await loadDevBuild({ projectId });
  return JSON.parse(build.pages) as PersistedPages;
};

const getPersistedProjectSettings = async ({
  projectId,
}: {
  projectId: string;
}) => {
  const build = await loadDevBuild({ projectId });
  return JSON.parse(build.projectSettings) as PersistedProjectSettings;
};

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

const openProjectSettings = async ({ page }: { page: PlaywrightPage }) => {
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Project settings" }).click();
  await page.getByRole("dialog", { name: "Project settings" }).waitFor();
};

const saveSiteName = async ({
  page,
  siteName,
}: {
  page: PlaywrightPage;
  siteName: string;
}) => {
  const save = waitForChangeToBeSaved({ page });
  await page
    .getByRole("textbox", { name: "Site name", exact: true })
    .fill(siteName);
  await save;
};

const setAtomicStyles = async ({
  page,
  checked,
}: {
  page: PlaywrightPage;
  checked: boolean;
}) => {
  await page.getByRole("option", { name: "Publish" }).click();
  const checkbox = page.getByRole("checkbox", {
    name: "Generate atomic CSS when publishing",
  });
  const toggle = async () => {
    const save = waitForChangeToBeSaved({ page });
    await checkbox.click();
    await save;
  };
  if ((await checkbox.isChecked()) === checked) {
    await toggle();
  }
  await toggle();
};

const addRedirect = async ({
  page,
  from,
  to,
}: {
  page: PlaywrightPage;
  from: string;
  to: string;
}) => {
  await page.getByRole("option", { name: "Redirects" }).click();
  await page.getByPlaceholder("/old-path or /old/*").waitFor();
  await page.getByPlaceholder("/old-path or /old/*").fill(from);
  await page.getByPlaceholder("/to-path or URL").fill(to);
  await page.keyboard.press("Escape");
  const save = waitForChangeToBeSaved({ page });
  await page
    .getByPlaceholder("/to-path or URL")
    .locator("xpath=following::button[2]")
    .click();
  await page.getByText(from, { exact: true }).waitFor();
  await save;
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

const deleteRedirect = async ({
  page,
  from,
}: {
  page: PlaywrightPage;
  from: string;
}) => {
  await page.getByText(from, { exact: true }).hover();
  const save = waitForChangeToBeSaved({ page });
  await page
    .getByRole("button", { name: `Delete redirect from ${from}` })
    .click();
  await save;
};

const expectPersistedProjectSettings = async ({
  projectId,
  siteName,
  redirect,
}: {
  projectId: string;
  siteName: string;
  redirect?: { from: string; to: string; status?: string };
}) => {
  const pages = await getPersistedPages({ projectId });
  const settings = await getPersistedProjectSettings({ projectId });
  if (settings.meta.siteName !== siteName) {
    throw new Error(
      `Expected siteName "${siteName}", received ${JSON.stringify(settings.meta)}.`
    );
  }

  const redirects = pages.redirects ?? [];
  if (redirect === undefined) {
    if (redirects.length !== 0) {
      throw new Error(
        `Expected no redirects, received ${JSON.stringify(redirects)}.`
      );
    }
    return;
  }

  if (
    redirects.some(
      (entry) =>
        entry.old === redirect.from &&
        entry.new === redirect.to &&
        (entry.status ?? "301") === (redirect.status ?? "301")
    ) === false
  ) {
    throw new Error(
      `Expected redirect ${JSON.stringify(redirect)}, received ${JSON.stringify(redirects)}.`
    );
  }
};

test("Project settings for site name, CSS, email, and redirects persist after reload", async ({
  page,
  context,
}) => {
  const email = "project-settings-runtime@webstudio.test";
  const fixture = await createContentModeProject({
    context,
    email,
    title: "Project Settings Runtime",
    devPlan: e2eEmailPlanName,
    assetNamePrefix: "project-settings-runtime-",
    editorToken: "project-settings-runtime-editor-token",
    builderToken: "project-settings-runtime-builder-token",
  });
  const siteName = "Runtime Settings Site";
  const redirect = {
    from: "/e2e-old-route",
    to: "/",
  };

  const recipients =
    '"Team, West" <team@example.com>, Owner <owner@example.com>';
  const sender = "Project Team <sender@example.com>";

  await measure("project settings runtime open builder", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.builderToken,
    });
    await waitForCanvasText({ page, text: "Initial content" });
  });

  await measure("project settings runtime update settings", async () => {
    await openProjectSettings({ page });
    await saveSiteName({ page, siteName });
    await setAtomicStyles({ page, checked: false });
    await addRedirect({
      page,
      from: redirect.from,
      to: redirect.to,
    });
  });

  await test.step("Save named email recipients and Reply to", async () => {
    await page.getByRole("option", { name: "Emails" }).click();

    let save = waitForChangeToBeSaved({ page });
    await page.getByRole("textbox", { name: "Recipients" }).fill(recipients);
    await save;

    save = waitForChangeToBeSaved({ page });
    await page.getByRole("textbox", { name: "Reply to" }).fill(sender);
    await save;

    const persisted = await getPersistedProjectSettings({
      projectId: fixture.projectId,
    });
    if (
      persisted.meta.contactEmail !== recipients ||
      persisted.meta.emailSender !== sender
    ) {
      throw new Error(
        `Expected saved Project Emails settings, received ${JSON.stringify(persisted.meta)}.`
      );
    }
  });

  await expectPersistedProjectSettings({
    projectId: fixture.projectId,
    siteName,
    redirect,
  });
  if (
    (await getPersistedProjectSettings({ projectId: fixture.projectId }))
      .compiler.atomicStyles !== false
  ) {
    throw new Error("Expected atomic CSS setting to persist as disabled.");
  }
  await Promise.all([
    measure("project settings runtime generated redirect response", () =>
      expectGeneratedAppRedirect({
        projectId: fixture.projectId,
        path: redirect.from,
        status: 301,
        location: redirect.to,
      })
    ),
    measure("project settings runtime reload with redirect", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
    }),
  ]);
  await openProjectSettings({ page });
  await page.getByRole("textbox", { name: "Site name", exact: true }).waitFor();
  const persistedSiteName = await page
    .getByRole("textbox", { name: "Site name", exact: true })
    .inputValue();
  if (persistedSiteName !== siteName) {
    throw new Error(
      `Expected project settings site name "${siteName}", received "${persistedSiteName}".`
    );
  }
  await page.getByRole("option", { name: "Redirects" }).click();
  await page.getByText(redirect.from, { exact: true }).waitFor();
  await page.getByRole("option", { name: "Publish" }).click();
  if (
    await page
      .getByRole("checkbox", {
        name: "Generate atomic CSS when publishing",
      })
      .isChecked()
  ) {
    throw new Error(
      "Expected atomic CSS setting to remain disabled after reload."
    );
  }
  await test.step("Verify email settings after reload", async () => {
    await page.getByRole("option", { name: "Emails" }).click();
    if (
      (await page.getByRole("textbox", { name: "Recipients" }).inputValue()) !==
        recipients ||
      (await page.getByRole("textbox", { name: "Reply to" }).inputValue()) !==
        sender
    ) {
      throw new Error("Expected Project Emails settings to survive reload.");
    }
  });
  await page.getByRole("option", { name: "Redirects" }).click();

  await measure("project settings runtime delete redirect", async () => {
    await deleteRedirect({ page, from: redirect.from });
  });
  await expectPersistedProjectSettings({
    projectId: fixture.projectId,
    siteName,
  });
  await Promise.all([
    measure("project settings runtime generated redirects after delete", () =>
      expectGeneratedRedirects({
        projectId: fixture.projectId,
        expectedRedirects: [],
      })
    ),
    measure(
      "project settings runtime reload after redirect delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
        await waitForCanvasText({ page, text: "Initial content" });
      }
    ),
  ]);
  await openProjectSettings({ page });
  await page.getByRole("option", { name: "Redirects" }).click();
  await page.getByText(redirect.from, { exact: true }).waitFor({
    state: "hidden",
  });
});

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
