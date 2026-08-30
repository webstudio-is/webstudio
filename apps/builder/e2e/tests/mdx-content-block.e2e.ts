import type { Page, Response } from "@playwright/test";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import {
  configureDynamicDetailContentBlock,
  configureEmptyHeadingTemplate,
  configureRepresentableContentBlockBody,
  configureRepeatedContentBlock,
} from "../fixtures/mdx-content-block-project";
import { createContentModeProject } from "../fixtures/content-mode-suite";
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
  confirmContentBlockConnection,
} from "../flows/content-block-source";
import { replaceCanvasText } from "../flows/content-editing";
import { waitForContentEditMode } from "../flows/content-editing";
import { waitForSyncStatus } from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import { openNavigatorPanel } from "../flows/navigator";
import { selectCanvasTextInstanceForProps } from "../flows/canvas-selection";
import { fillSelectedStringProperty } from "../flows/props-panel";
import { getProjectBuilderUrl, test } from "../test";

const sourceFilename = "content-source.mdx";
const alternateFilename = "alternate-source.mdx";
const unresolvedFilename = "unresolved-source.mdx";
const emptyFilename = "empty-source.mdx";

const sourceHeading = "MDX source heading";
const editedHeading = "Edited MDX source heading";
const editedTemplateText = "Edited MDX template heading";
const alternateHeading = "Alternate MDX heading";

const isAssetContentResponse = (response: Response, method = "PUT") =>
  response.request().method() === method &&
  response.url().includes("/rest/assets/") &&
  response.url().includes("/content");

const waitForAssetWrite = (page: Page) =>
  page.waitForResponse(
    (response) => isAssetContentResponse(response) && response.status() === 200,
    { timeout: 30_000 }
  );

const waitForReorderedAssetWrite = ({
  page,
  before,
  after,
}: {
  page: Page;
  before: string;
  after: string;
}) =>
  page.waitForResponse(
    (response) => {
      if (isAssetContentResponse(response) === false) {
        return false;
      }
      const source = response.request().postData() ?? "";
      const beforeIndex = source.indexOf(before);
      const afterIndex = source.indexOf(after);
      return (
        beforeIndex !== -1 && afterIndex !== -1 && beforeIndex < afterIndex
      );
    },
    { timeout: 30_000 }
  );

const expectCanvasTextOrder = async ({
  page,
  before,
  after,
}: {
  page: Page;
  before: string;
  after: string;
}) => {
  const canvas = await waitForCanvasFrame({ page });
  const beforeElement = canvas.getByText(before, { exact: true });
  const afterElement = canvas.getByText(after, { exact: true });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const afterHandle = await afterElement.elementHandle();
    if (afterHandle !== null) {
      const isBefore = await beforeElement.evaluate(
        (element, afterElement) =>
          (element.compareDocumentPosition(afterElement) &
            Node.DOCUMENT_POSITION_FOLLOWING) !==
          0,
        afterHandle
      );
      if (isBefore) {
        return;
      }
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`Expected "${before}" before "${after}" on the canvas`);
};

const insertTemplateIntoEmptyContentBlock = async ({
  page,
  templateName,
}: {
  page: Page;
  templateName: string;
}) => {
  await waitForContentEditMode({ page });
  const canvas = await waitForCanvasFrame({ page });
  const block = canvas.locator('[data-ws-component="ws:block"]').last();
  await block.hover();
  const insert = page.getByRole("button", { name: "Insert block" }).last();
  await insert.waitFor({ state: "visible" });
  await insert.focus();
  await insert.press("Enter");
  await page.getByRole("menuitemradio", { name: templateName }).click();
};

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

test("Content Block MDX source lifecycle persists edits and resets to empty", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "mdx-content-source-e2e@webstudio.test",
    title: "MDX Content Source E2E",
  });
  await configureRepresentableContentBlockBody(fixture.projectId);

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await openAssetsPanel({ page });
  await uploadAsset({ page, filename: sourceFilename });
  await uploadAsset({ page, filename: alternateFilename });

  await selectContentBlock({ page });
  await chooseContentBlockSource({ page, filename: sourceFilename });
  await confirmContentBlockConnection({ page });
  await waitForCanvasText({ page, text: sourceHeading });
  await waitForSyncStatus({ page, status: "idle" });
  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  const templateWrite = waitForAssetWrite(page).catch((error: unknown) =>
    error instanceof Error ? error : new Error("Asset write failed")
  );
  await insertTemplateAfterCanvasText({
    page,
    anchorText: sourceHeading,
    templateName: fixture.editableTextTemplateName,
  });
  await waitForCanvasText({
    page,
    text: fixture.editableTextTemplateText,
  });
  const templateResponse = await templateWrite;
  if (templateResponse instanceof Error) {
    throw templateResponse;
  }
  const templateDocument = await parseMdxDocument({
    source: templateResponse.request().postData() ?? "",
  });
  if (
    templateDocument.children.some(
      (node) =>
        node.type === "element" &&
        node.syntax === "markdown" &&
        node.tag === "p" &&
        node.children.some(
          (child) =>
            child.type === "text" &&
            child.value === fixture.editableTextTemplateText
        )
    ) === false
  ) {
    throw new Error(
      "Inserting a plain Content Block template must persist as Markdown"
    );
  }
  const templateTextWrite = waitForAssetWrite(page).catch((error: unknown) =>
    error instanceof Error ? error : new Error("Asset write failed")
  );
  await replaceCanvasText({
    page,
    currentText: fixture.editableTextTemplateText,
    text: editedTemplateText,
    waitForProjectSync: false,
  });
  const templateTextResponse = await templateTextWrite;
  if (templateTextResponse instanceof Error) {
    throw templateTextResponse;
  }
  const templateTextRequestBody = templateTextResponse.request().postData();
  const templateTextDocument = await parseMdxDocument({
    source: templateTextRequestBody ?? "",
  });
  if (
    templateTextDocument.children.some(
      (node) =>
        node.type === "element" &&
        node.syntax === "markdown" &&
        node.tag === "p" &&
        node.children.some(
          (child) => child.type === "text" && child.value === editedTemplateText
        )
    ) === false
  ) {
    throw new Error(
      "Editing a plain Content Block template must persist as Markdown"
    );
  }
  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await selectContentBlock({ page });
  await page.getByRole("button", { name: "Open", exact: true }).click();
  const fileEditor = page.getByRole("dialog").locator(".cm-content");
  await fileEditor.waitFor({ state: "visible" });
  if ((await fileEditor.textContent())?.includes(editedTemplateText) !== true) {
    throw new Error(
      "Opening an MDX Asset after a canvas save must show the latest content"
    );
  }
  await page.keyboard.press("Escape");
  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await Promise.all([
    waitForAssetWrite(page),
    replaceCanvasText({
      page,
      currentText: sourceHeading,
      text: editedHeading,
      waitForProjectSync: false,
    }),
  ]);
  await openNavigatorPanel({ page });
  const contentBlockItem = page
    .locator("[data-navigator-tree] [data-tree-button]")
    .filter({ hasText: "Content Block" })
    .last();
  await contentBlockItem.press("ArrowRight");
  const editingCanvas = await waitForCanvasFrame({ page });
  await editingCanvas
    .getByText("Editable MDX source text.", { exact: true })
    .click();
  await page.keyboard.press("Escape");
  await Promise.all([
    waitForReorderedAssetWrite({
      page,
      before: "Editable MDX source text.",
      after: editedTemplateText,
    }),
    page.keyboard.press("Control+ArrowUp"),
  ]);
  await expectCanvasTextOrder({
    page,
    before: "Editable MDX source text.",
    after: editedTemplateText,
  });
  const deleteWrite = waitForAssetWrite(page);
  const canvas = await waitForCanvasFrame({ page });
  await page.keyboard.down("Alt");
  try {
    await canvas.getByText(editedTemplateText, { exact: true }).hover();
    await page.getByRole("button", { name: "Delete block" }).last().click();
  } finally {
    await page.keyboard.up("Alt");
  }
  const deleteSource = (await deleteWrite).request().postData() ?? "";
  if (
    deleteSource.includes(editedTemplateText) ||
    deleteSource.includes("Editable MDX source text.") === false
  ) {
    throw new Error(
      `Deleting one instance removed the wrong content: ${deleteSource}`
    );
  }
  await waitForCanvasTextHidden({ page, text: editedTemplateText });
  await waitForCanvasText({ page, text: "Editable MDX source text." });
  await selectCanvasTextInstanceForProps({
    page,
    text: "Editable MDX link",
    propertyLabel: "Href",
  });
  const linkWrite = waitForAssetWrite(page);
  await fillSelectedStringProperty({
    page,
    label: "Href",
    control: "url",
    value: "https://webstudio.is",
    waitForProjectSync: false,
  });
  const linkSource = (await linkWrite).request().postData() ?? "";
  const linkDocument = await parseMdxDocument({ source: linkSource });
  if (
    linkDocument.children.some(
      (node) =>
        node.type === "element" &&
        node.syntax === "markdown" &&
        node.tag === "p" &&
        node.children.some(
          (child) =>
            child.type === "element" &&
            child.syntax === "markdown" &&
            child.tag === "a" &&
            child.props.some(
              (prop) =>
                prop.name === "href" && prop.value === "https://webstudio.is/"
            ) &&
            child.children.some(
              (linkChild) =>
                linkChild.type === "text" &&
                linkChild.value === "Editable MDX link"
            )
        )
    ) === false
  ) {
    throw new Error(`Expected Markdown link persistence: ${linkSource}`);
  }

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await waitForCanvasText({ page, text: editedHeading });
  await waitForCanvasTextHidden({ page, text: editedTemplateText });
  await selectContentBlock({ page });

  await chooseContentBlockSource({
    page,
    filename: alternateFilename,
    action: "Switch file",
  });
  await page.getByText(alternateFilename, { exact: true }).waitFor();
  await waitForCanvasText({ page, text: alternateHeading });
  await waitForCanvasTextHidden({ page, text: editedHeading });

  await selectContentBlock({ page });
  await page.getByRole("button", { name: "Open", exact: true }).click();
  const alternateEditor = page.getByRole("dialog").locator(".cm-content");
  await alternateEditor.waitFor({ state: "visible" });
  if (
    (await alternateEditor.textContent())?.includes(alternateHeading) !== true
  ) {
    throw new Error(
      "The selected alternate MDX Asset did not contain its expected source"
    );
  }
  await page.keyboard.press("Escape");
  await disconnectContentBlockSource({ page });
  await waitForSyncStatus({ page, status: "idle" });
  await waitForCanvasTextHidden({ page, text: alternateHeading });

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await waitForCanvasTextHidden({ page, text: alternateHeading });
  await selectContentBlock({ page });
  await page
    .getByRole("button", { name: "Connect .mdx file", exact: true })
    .waitFor();
});

test("Empty MDX content supports insertion and keeps the next paragraph focused", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "empty-mdx-content-source-e2e@webstudio.test",
    title: "Empty MDX Content Source E2E",
  });
  await configureEmptyHeadingTemplate(fixture.projectId);

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await openAssetsPanel({ page });
  await uploadAsset({ page, filename: emptyFilename });
  await selectContentBlock({ page });
  await chooseContentBlockSource({ page, filename: emptyFilename });
  await confirmContentBlockConnection({ page });
  await waitForSyncStatus({ page, status: "idle" });

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await insertTemplateIntoEmptyContentBlock({
    page,
    templateName: "Empty Heading Template",
  });
  const canvas = await waitForCanvasFrame({ page });
  await canvas.locator("h1").waitFor({ state: "visible" });
  const headingEditor = canvas.locator("h1[contenteditable]");
  await headingEditor.waitFor({ state: "visible" });
  await page.keyboard.type("First heading");
  await headingEditor.getByText("First heading", { exact: true }).waitFor();
  await page.keyboard.press("Enter");

  const paragraphEditor = canvas.locator("p[contenteditable]");
  await paragraphEditor.waitFor({ state: "visible" });
  await page.keyboard.press("/");
  await page
    .getByRole("menuitemradio", { name: "Empty Heading Template" })
    .last()
    .waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.keyboard.type("Focused paragraph");
  const paragraphId = await paragraphEditor.getAttribute("data-ws-id");
  if (paragraphId === null) {
    throw new Error("Expected the focused paragraph instance id");
  }
  await page.keyboard.press("Enter");
  const emptyParagraphEditor = canvas.locator(
    `p[contenteditable]:not([data-ws-id="${paragraphId}"])`
  );
  await emptyParagraphEditor.waitFor({ state: "visible" });
  const emptyParagraphId =
    await emptyParagraphEditor.getAttribute("data-ws-id");
  if (emptyParagraphId === null) {
    throw new Error("Expected the new paragraph instance id");
  }
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await canvas
    .locator(`p[data-ws-id="${emptyParagraphId}"]`)
    .waitFor({ state: "detached" });
  if (
    (await paragraphEditor.evaluate(
      (element) =>
        element === document.activeElement ||
        element.contains(document.activeElement)
    )) === false
  ) {
    throw new Error("Expected the previous paragraph to regain focus");
  }
  const finalWrite = waitForAssetWrite(page);
  await page.mouse.click(5, 5);
  const finalSource = (await finalWrite).request().postData() ?? "";
  if (
    finalSource.includes("# First heading") === false ||
    finalSource.includes("Focused paragraph") === false ||
    finalSource.includes('ws:tag="p"')
  ) {
    throw new Error(`Unexpected final MDX source: ${finalSource}`);
  }

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });
  await waitForCanvasText({ page, text: "First heading" });
  await waitForCanvasText({ page, text: "Focused paragraph" });
});

test("Content Block requires a Builder reload after a stale file revision", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "mdx-content-conflict-e2e@webstudio.test",
    title: "MDX Content Conflict E2E",
  });

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await openAssetsPanel({ page });
  await uploadAsset({ page, filename: sourceFilename });
  await selectContentBlock({ page });
  await chooseContentBlockSource({ page, filename: sourceFilename });
  await confirmContentBlockConnection({ page });
  await waitForCanvasText({ page, text: sourceHeading });
  await waitForSyncStatus({ page, status: "idle" });
  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.editorToken,
    mode: "content",
  });

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

  let reloadPromptMessage: string | undefined;
  const reloadPromptHandled = new Promise<void>((resolve) => {
    page.once("dialog", (dialog) => {
      reloadPromptMessage = dialog.message();
      void dialog.dismiss().then(resolve);
    });
  });
  await replaceCanvasText({
    page,
    currentText: sourceHeading,
    text: "Unsaved conflict heading",
    waitForProjectSync: false,
  });
  await reloadPromptHandled;
  if (
    reloadPromptMessage !==
    "This file changed since it was opened. Reload it before saving again."
  ) {
    throw new Error(
      `Expected stale revision reload prompt: ${reloadPromptMessage}`
    );
  }
  await page
    .getByRole("status")
    .filter({
      hasText: "Synchronization has been paused. Please reload to continue.",
    })
    .first()
    .waitFor();

  await page.unroute("**/rest/assets/*/content?*");
  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await waitForCanvasText({ page, text: sourceHeading });
});

test("Unresolved MDX templates are selectable only in the Builder canvas", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "mdx-content-warning-e2e@webstudio.test",
    title: "MDX Content Warning E2E",
  });

  await openFixture({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  await openAssetsPanel({ page });
  await uploadAsset({ page, filename: unresolvedFilename });
  await selectContentBlock({ page });
  await chooseContentBlockSource({ page, filename: unresolvedFilename });
  await confirmContentBlockConnection({ page });
  await waitForSyncStatus({ page, status: "idle" });

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
  await page.getByRole("img", { name: /^MDX source warning:/ }).waitFor();
  await page.getByRole("button", { name: "Open", exact: true }).waitFor();

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
});

test("Dynamic detail source follows the selected route parameter", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "mdx-content-detail-e2e@webstudio.test",
    title: "MDX Content Detail E2E",
  });

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
});

test("Repeated Content Block scopes edit distinct MDX files without leakage", async ({
  page,
  context,
}) => {
  const fixture = await createContentModeProject({
    context: context,
    email: "mdx-content-repeated-e2e@webstudio.test",
    title: "MDX Content Repeated E2E",
  });

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
});
