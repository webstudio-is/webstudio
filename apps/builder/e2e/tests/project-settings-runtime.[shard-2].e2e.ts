import type { Page as PlaywrightPage } from "playwright";
import type { Page as WebstudioPage } from "@webstudio-is/sdk";
import { loadDevBuild, updateProject } from "../db";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { loginWithSecret } from "../flows/dashboard";
import {
  createPageFromTemplate,
  openPage,
  openPageSettings,
} from "../flows/pages-panel";
import {
  waitForChangeToBeSaved,
  waitForSyncStatus,
} from "../flows/sync-status";
import { expectGeneratedRedirects } from "../flows/generated-app";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";

type PersistedPages = {
  meta?: {
    siteName?: string;
  };
  redirects?: Array<{
    old: string;
    new: string;
    status?: string;
  }>;
  pages: WebstudioPage[];
};

const getPersistedPages = async ({ projectId }: { projectId: string }) => {
  const build = await loadDevBuild({ projectId });
  return JSON.parse(build.pages) as PersistedPages;
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
  await page.getByRole("button", { name: "Menu Button" }).click();
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
  await page.getByLabel("Site name").fill(siteName);
  await save;
  await waitForSyncStatus({ page, status: "idle" });
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
  await page
    .getByPlaceholder("/to-path or URL")
    .locator("xpath=following::button[2]")
    .click();
  await page.getByText(from, { exact: true }).waitFor();
  await waitForSyncStatus({ page, status: "idle" });
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
  await waitForSyncStatus({ page, status: "idle" });
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
  if (pages.meta?.siteName !== siteName) {
    throw new Error(
      `Expected siteName "${siteName}", received ${JSON.stringify(pages.meta)}.`
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

test("Project settings site name and redirects persist after reload", async () => {
  const email = "project-settings-runtime@webstudio.test";
  const fixture = await createContentModeProject({
    email,
    title: "Project Settings Runtime",
    assetNamePrefix: "project-settings-runtime-",
    editorToken: "project-settings-runtime-editor-token",
    builderToken: "project-settings-runtime-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const siteName = "Runtime Settings Site";
  const redirect = {
    from: "/e2e-old-route",
    to: "/",
  };

  try {
    await loginWithSecret({ page, email });

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
      await addRedirect({
        page,
        from: redirect.from,
        to: redirect.to,
      });
    });

    await expectPersistedProjectSettings({
      projectId: fixture.projectId,
      siteName,
      redirect,
    });
    await measure("project settings runtime generated redirects", async () => {
      await expectGeneratedRedirects({
        projectId: fixture.projectId,
        expectedRedirects: [
          {
            old: redirect.from,
            new: redirect.to,
            status: "301",
          },
        ],
      });
    });

    await measure("project settings runtime reload with redirect", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
    });
    await openProjectSettings({ page });
    await page.getByLabel("Site name").waitFor();
    const persistedSiteName = await page.getByLabel("Site name").inputValue();
    if (persistedSiteName !== siteName) {
      throw new Error(
        `Expected project settings site name "${siteName}", received "${persistedSiteName}".`
      );
    }
    await page.getByRole("option", { name: "Redirects" }).click();
    await page.getByText(redirect.from, { exact: true }).waitFor();

    await measure("project settings runtime delete redirect", async () => {
      await deleteRedirect({ page, from: redirect.from });
    });
    await expectPersistedProjectSettings({
      projectId: fixture.projectId,
      siteName,
    });
    await measure(
      "project settings runtime generated redirects after delete",
      async () => {
        await expectGeneratedRedirects({
          projectId: fixture.projectId,
          expectedRedirects: [],
        });
      }
    );

    await measure(
      "project settings runtime reload after redirect delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.builderToken,
        });
        await waitForCanvasText({ page, text: "Initial content" });
      }
    );
    await openProjectSettings({ page });
    await page.getByRole("option", { name: "Redirects" }).click();
    await page.getByText(redirect.from, { exact: true }).waitFor({
      state: "hidden",
    });
  } finally {
    await close();
  }
});

test("Marketplace page settings persist after reload", async () => {
  const email = "marketplace-page-settings-runtime@webstudio.test";
  const fixture = await createContentModeProject({
    email,
    title: "Marketplace Page Settings Runtime",
    assetNamePrefix: "marketplace-page-settings-runtime-",
    editorToken: "marketplace-page-settings-runtime-editor-token",
    builderToken: "marketplace-page-settings-runtime-builder-token",
  });
  const { page, close } = await newIsolatedPage();
  const pageName = "Marketplace Runtime Page";
  const category = "Runtime Examples";

  await updateProject(fixture.projectId, {
    marketplaceApprovalStatus: "PENDING",
  });

  try {
    await loginWithSecret({ page, email });

    await measure("marketplace page settings open builder", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
    });

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
        await waitForSyncStatus({ page, status: "idle" });

        const categorySave = waitForChangeToBeSaved({ page });
        await page.getByLabel("Category").fill(category);
        await page.getByLabel("Category").blur();
        await categorySave;
        await waitForSyncStatus({ page, status: "idle" });
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
      (await page.getByLabel("Include in the marketplace").isChecked()) ===
      false
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
  } finally {
    await close();
  }
});
