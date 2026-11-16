import type { Page as PlaywrightPage } from "@playwright/test";
import type { Page as WebstudioPage } from "@webstudio-is/sdk";
import { loadDevBuild } from "../db";
import { measure } from "../perf";
import { test } from "../test";
import { openProjectBuilder, waitForCanvasText } from "./builder";
import { expectGeneratedRedirects } from "./generated-app";
import { waitForChangeToBeSaved } from "./sync-status";

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

export const getPersistedPages = async ({
  projectId,
}: {
  projectId: string;
}) => {
  const build = await loadDevBuild({ projectId });
  return JSON.parse(build.pages) as PersistedPages;
};

export const getPersistedProjectSettings = async ({
  projectId,
}: {
  projectId: string;
}) => {
  const build = await loadDevBuild({ projectId });
  return JSON.parse(build.projectSettings) as PersistedProjectSettings;
};

export const openProjectSettings = async ({
  page,
}: {
  page: PlaywrightPage;
}) => {
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

export const withSavedProjectRedirect = async ({
  page,
  fixture,
  verifyPreview,
}: {
  page: PlaywrightPage;
  fixture: { projectId: string; builderToken: string };
  verifyPreview: (redirect: { from: string; to: string }) => Promise<void>;
}) => {
  const siteName = "Runtime Settings Site";
  const redirect = {
    from: "/e2e-old-route",
    to: "/",
  };

  const recipients = '"Team, West" <team@mcp.test>, Owner <owner@mcp.test>';
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
  const reloadAndPreview = await Promise.allSettled([
    verifyPreview(redirect),
    measure("project settings runtime reload with redirect", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
      await waitForCanvasText({ page, text: "Initial content" });
    }),
  ]);
  for (const check of reloadAndPreview) {
    if (check.status === "rejected") {
      throw check.reason;
    }
  }
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
};
