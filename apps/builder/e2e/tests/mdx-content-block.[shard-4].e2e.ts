import type { Page, Request, Response } from "playwright";
import {
  configureDynamicDetailContentBlock,
  configureRepresentableContentBlockBody,
  configureRepeatedContentBlock,
} from "../fixtures/mdx-content-block-project";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { expectTextHidden } from "../flows/assertions";
import {
  getAssetIdByFilename,
  openAssetsPanel,
  uploadAsset,
} from "../flows/assets-panel";
import {
  openProjectBuilder,
  waitForCanvasFrame,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import {
  chooseContentBlockSource,
  disconnectContentBlockSource,
  selectContentBlock,
  useFileContent,
} from "../flows/content-block-source";
import { replaceCanvasText } from "../flows/content-editing";
import { waitForSyncStatus } from "../flows/sync-status";
import { getProjectBuilderUrl, newIsolatedPage, test } from "../harness";

const sourceFilename = "content-source.mdx";
const alternateFilename = "alternate-source.mdx";
const unresolvedFilename = "unresolved-source.mdx";

const sourceHeading = "MDX source heading";
const editedHeading = "Edited MDX source heading";
const alternateHeading = "Alternate MDX heading";

const isAssetContentResponse = (response: Response, method = "PUT") =>
  response.request().method() === method &&
  response.url().includes("/rest/assets/") &&
  response.url().includes("/content");

const isAssetContentRequest = (request: Request, method = "PUT") =>
  request.method() === method &&
  request.url().includes("/rest/assets/") &&
  request.url().includes("/content");

const waitForAssetWrite = (page: Page) =>
  page.waitForResponse(
    (response) => isAssetContentResponse(response) && response.status() === 200,
    { timeout: 30_000 }
  );

const openFixture = async ({
  page,
  projectId,
  authToken,
  mode,
  pageId,
}: {
  page: Page;
  projectId: string;
  authToken: string;
  mode?: "content" | "preview";
  pageId?: string;
}) => {
  await openProjectBuilder({ page, projectId, authToken, mode, pageId });
  await waitForSyncStatus({ page, status: "idle" });
};

test("Content Block MDX source lifecycle persists edits and disconnect copy", async () => {
  const fixture = await createContentModeProject({
    email: "mdx-content-source-e2e@webstudio.test",
    title: "MDX Content Source E2E",
  });
  await configureRepresentableContentBlockBody(fixture.projectId);
  const { page, close } = await newIsolatedPage();

  try {
    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await openAssetsPanel({ page });
    await uploadAsset({ page, filename: sourceFilename });
    await uploadAsset({ page, filename: alternateFilename });

    await selectContentBlock({ page });
    let assetWriteCount = 0;
    const countAssetWrites = (request: Request) => {
      if (isAssetContentRequest(request)) {
        assetWriteCount += 1;
      }
    };
    page.on("request", countAssetWrites);
    await chooseContentBlockSource({ page, filename: sourceFilename });
    const sourceDialog = page.getByRole("dialog", {
      name: "Connect content source",
    });
    await sourceDialog
      .getByRole("button", { name: "Replace file body with block content" })
      .click();
    await sourceDialog
      .getByRole("alert")
      .getByText(
        "Replacing file content while changing the Content Block source requires atomic project and Asset persistence, which is not available yet.",
        { exact: true }
      )
      .waitFor();
    if (assetWriteCount !== 0) {
      throw new Error("Blocked source replacement must not write the Asset");
    }
    await useFileContent({ page });
    page.off("request", countAssetWrites);
    await waitForCanvasText({ page, text: sourceHeading });

    await Promise.all([
      waitForAssetWrite(page),
      replaceCanvasText({
        page,
        currentText: sourceHeading,
        text: editedHeading,
        waitForProjectSync: false,
      }),
    ]);

    const undoWrite = waitForAssetWrite(page);
    await page.keyboard.press("ControlOrMeta+Z");
    await undoWrite;
    await waitForCanvasText({ page, text: sourceHeading });

    const redoWrite = waitForAssetWrite(page);
    await page.keyboard.press("ControlOrMeta+Shift+Z");
    await redoWrite;
    await waitForCanvasText({ page, text: editedHeading });

    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await waitForCanvasText({ page, text: editedHeading });
    await selectContentBlock({ page });

    let releaseRead: (() => void) | undefined;
    const readReleased = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    let markReadContinued: (() => void) | undefined;
    const readContinued = new Promise<void>((resolve) => {
      markReadContinued = resolve;
    });
    let blockedRead = false;
    await page.route("**/rest/assets/*/content?*", async (route) => {
      if (route.request().method() !== "GET" || blockedRead) {
        await route.continue();
        return;
      }
      blockedRead = true;
      await readReleased;
      await route.continue();
      markReadContinued?.();
    });

    await chooseContentBlockSource({
      page,
      filename: alternateFilename,
      action: "Replace or switch",
    });
    await waitForCanvasText({ page, text: editedHeading });
    await page.getByText("Updating content source…", { exact: true }).waitFor();
    const loadingCanvas = await waitForCanvasFrame({ page });
    await loadingCanvas.getByText(editedHeading, { exact: true }).dblclick();
    if ((await loadingCanvas.locator('[contenteditable="true"]').count()) > 0) {
      throw new Error(
        "Previous MDX content must stay read-only while switching"
      );
    }

    releaseRead?.();
    await readContinued;
    await page.unroute("**/rest/assets/*/content?*");
    await selectContentBlock({ page });
    await chooseContentBlockSource({
      page,
      filename: alternateFilename,
      action: "Replace or switch",
    });
    await useFileContent({ page });
    await waitForCanvasText({ page, text: alternateHeading });
    await waitForCanvasTextHidden({ page, text: editedHeading });

    await selectContentBlock({ page });
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    const disconnectDialog = page.getByRole("dialog", {
      name: "Disconnect content source",
    });
    await disconnectDialog.waitFor();
    await disconnectDialog.getByRole("button", { name: "Cancel" }).click();
    await page
      .getByRole("button", { name: "Disconnect", exact: true })
      .waitFor();
    await disconnectContentBlockSource({ page });
    await waitForSyncStatus({ page, status: "idle" });
    await waitForCanvasText({ page, text: alternateHeading });

    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await waitForCanvasText({ page, text: alternateHeading });
    await selectContentBlock({ page });
    await page.getByText("No content source", { exact: true }).waitFor();
  } finally {
    await close();
  }
});

test("Content Block shows recoverable conflicts without overwriting the file", async () => {
  const fixture = await createContentModeProject({
    email: "mdx-content-conflict-e2e@webstudio.test",
    title: "MDX Content Conflict E2E",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await openAssetsPanel({ page });
    await uploadAsset({ page, filename: sourceFilename });
    await selectContentBlock({ page });
    await chooseContentBlockSource({ page, filename: sourceFilename });
    await useFileContent({ page });
    await waitForCanvasText({ page, text: sourceHeading });

    await page.route("**/rest/assets/*/content?*", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ message: "Asset revision conflict" }),
        });
        return;
      }
      await route.continue();
    });

    await replaceCanvasText({
      page,
      currentText: sourceHeading,
      text: "Unsaved conflict heading",
      waitForProjectSync: false,
    });
    const canvas = await waitForCanvasFrame({ page });
    await canvas.getByText("MDX conflict", { exact: true }).waitFor();
    await canvas.getByRole("button", { name: "Copy unsaved MDX" }).click();
    const copied = await page.evaluate(async () =>
      navigator.clipboard.readText()
    );
    if (copied.includes("Unsaved conflict heading") === false) {
      throw new Error("Expected conflict recovery to copy the unsaved MDX");
    }

    await page.unroute("**/rest/assets/*/content?*");
    await canvas.getByRole("button", { name: "Reload remote file" }).click();
    await waitForCanvasText({ page, text: sourceHeading });
    await canvas.getByText("MDX conflict", { exact: true }).waitFor({
      state: "hidden",
    });
  } finally {
    await close();
  }
});

test("Unresolved MDX templates are selectable only in the Builder canvas", async () => {
  const fixture = await createContentModeProject({
    email: "mdx-content-warning-e2e@webstudio.test",
    title: "MDX Content Warning E2E",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await openAssetsPanel({ page });
    await uploadAsset({ page, filename: unresolvedFilename });
    await selectContentBlock({ page });
    await chooseContentBlockSource({ page, filename: unresolvedFilename });
    await useFileContent({ page });

    await waitForCanvasText({ page, text: "Valid MDX sibling" });
    await waitForCanvasText({
      page,
      text: "Valid content after the missing template.",
    });
    const canvas = await waitForCanvasFrame({ page });
    const warning = canvas.getByText("Missing template: Missing E2E Template", {
      exact: true,
    });
    await warning.waitFor();
    await warning.click();
    await selectContentBlock({ page });
    await page.getByRole("list", { name: "MDX diagnostics" }).waitFor();
    await page.getByRole("button", { name: "Open file to repair" }).waitFor();

    const previewUrl = getProjectBuilderUrl({
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      mode: "preview",
    });
    await page.goto(previewUrl);
    await waitForCanvasText({ page, text: "Valid MDX sibling" });
    await waitForCanvasText({
      page,
      text: "Valid content after the missing template.",
    });
    const previewCanvas = await waitForCanvasFrame({ page });
    await previewCanvas
      .getByText("Missing template: Missing E2E Template", { exact: true })
      .waitFor({ state: "hidden" });
    await expectTextHidden({ page, text: "Open file to repair" });
  } finally {
    await close();
  }
});

test("Dynamic detail source follows the selected route parameter", async () => {
  const fixture = await createContentModeProject({
    email: "mdx-content-detail-e2e@webstudio.test",
    title: "MDX Content Detail E2E",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await openAssetsPanel({ page });
    await uploadAsset({ page, filename: sourceFilename });
    await uploadAsset({ page, filename: alternateFilename });
    const sourceAssetId = await getAssetIdByFilename({
      page,
      filename: sourceFilename,
    });
    const alternateAssetId = await getAssetIdByFilename({
      page,
      filename: alternateFilename,
    });
    const detailPageId = await configureDynamicDetailContentBlock({
      projectId: fixture.projectId,
      initialAssetId: sourceAssetId,
    });

    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      pageId: detailPageId,
    });
    await waitForCanvasText({ page, text: sourceHeading });

    await page
      .getByRole("button", { name: "Toggle dynamic page address" })
      .click();
    const parameter = page.getByPlaceholder("assetid");
    await parameter.fill(alternateAssetId);
    await parameter.press("Enter");
    await waitForCanvasText({ page, text: alternateHeading });
    await waitForCanvasTextHidden({ page, text: sourceHeading });

    await page
      .getByRole("button", { name: "Toggle dynamic page address" })
      .click();
    await page.getByPlaceholder("assetid").fill(sourceAssetId);
    await page.getByPlaceholder("assetid").press("Enter");
    await waitForCanvasText({ page, text: sourceHeading });
    await waitForCanvasTextHidden({ page, text: alternateHeading });
  } finally {
    await close();
  }
});

test("Repeated Content Block scopes edit distinct MDX files without leakage", async () => {
  const fixture = await createContentModeProject({
    email: "mdx-content-repeated-e2e@webstudio.test",
    title: "MDX Content Repeated E2E",
  });
  const { page, close } = await newIsolatedPage();

  try {
    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await openAssetsPanel({ page });
    await uploadAsset({ page, filename: sourceFilename });
    await uploadAsset({ page, filename: alternateFilename });
    const sourceAssetId = await getAssetIdByFilename({
      page,
      filename: sourceFilename,
    });
    const alternateAssetId = await getAssetIdByFilename({
      page,
      filename: alternateFilename,
    });
    await configureRepeatedContentBlock({
      projectId: fixture.projectId,
      assetIds: [sourceAssetId, alternateAssetId],
    });

    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await waitForCanvasText({ page, text: sourceHeading });
    await waitForCanvasText({ page, text: alternateHeading });

    const write = waitForAssetWrite(page);
    await replaceCanvasText({
      page,
      currentText: sourceHeading,
      text: editedHeading,
      waitForProjectSync: false,
    });
    await write;
    await waitForCanvasText({ page, text: editedHeading });
    await waitForCanvasText({ page, text: alternateHeading });

    await openFixture({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
    });
    await waitForCanvasText({ page, text: editedHeading });
    await waitForCanvasText({ page, text: alternateHeading });
  } finally {
    await close();
  }
});
