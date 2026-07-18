import type { Page } from "playwright";
import { deleteContentBlockChildAfterCanvasText } from "../flows/block-outline";
import {
  openProjectBuilder,
  waitForCanvasFrame,
  waitForCanvasText,
  waitForCanvasTextHidden,
} from "../flows/builder";
import { selectCanvasTextInstanceForProps } from "../flows/canvas-selection";
import { expectLocatorHidden, expectTextHidden } from "../flows/assertions";
import {
  selectCanvasImage,
  selectCanvasVideoSource,
  waitForCanvasImage,
  waitForCanvasVideoSource,
} from "../flows/canvas-media";
import {
  pasteCanvasText,
  removeCanvasInlineLink,
  replaceCanvasText,
  replaceCanvasTextAndApplyInlineFormats,
} from "../flows/content-editing";
import {
  fillSelectedNumberProperty,
  fillSelectedStringProperty,
  waitForSelectedNumberPropertyValue,
  waitForSelectedStringPropertyValue,
} from "../flows/props-panel";
import {
  expectContentModeTemplateActionsUnavailable,
  openPagesPanel,
} from "../flows/pages-panel";
import { waitForSyncStatus } from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import {
  getSharedContentModeProject,
  setupSharedContentModeProject,
} from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";
import { loadDevBuild } from "../db";

const getElementTagWithTextCount = async ({
  projectId,
  tag,
  text,
}: {
  projectId: string;
  tag: string;
  text: string;
}) => {
  const build = await loadDevBuild({ projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    component: string;
    tag?: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );

  const instanceContainsText = (instanceId: string): boolean => {
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return false;
    }
    return (
      instance.children?.some((child) => {
        if (child.type === "text") {
          return child.value?.includes(text);
        }
        if (child.type === "id" && child.value !== undefined) {
          return instanceContainsText(child.value);
        }
        return false;
      }) ?? false
    );
  };

  return instances.filter(
    (instance) =>
      instance.component === "ws:element" &&
      instance.tag === tag &&
      instanceContainsText(instance.id)
  ).length;
};

const getElementHrefWithText = async ({
  projectId,
  text,
}: {
  projectId: string;
  text: string;
}) => {
  const build = await loadDevBuild({ projectId });
  const instances = JSON.parse(build.instances) as Array<{
    id: string;
    tag?: string;
    children?: Array<{ type: string; value?: string }>;
  }>;
  const props = JSON.parse(build.props) as Array<{
    instanceId: string;
    name: string;
    type: string;
    value: unknown;
  }>;
  const instancesById = new Map(
    instances.map((instance) => [instance.id, instance])
  );

  const instanceContainsText = (instanceId: string): boolean => {
    const instance = instancesById.get(instanceId);
    if (instance === undefined) {
      return false;
    }
    return (
      instance.children?.some((child) => {
        if (child.type === "text") {
          return child.value?.includes(text);
        }
        return (
          child.type === "id" &&
          child.value !== undefined &&
          instanceContainsText(child.value)
        );
      }) ?? false
    );
  };

  const link = instances.find(
    (instance) => instance.tag === "a" && instanceContainsText(instance.id)
  );
  if (link === undefined) {
    throw new Error(`Expected a link containing "${text}"`);
  }
  const href = props.find(
    (prop) => prop.instanceId === link.id && prop.name === "href"
  );
  if (href?.type !== "string" || typeof href.value !== "string") {
    throw new Error(`Expected a static href for link containing "${text}"`);
  }
  return href.value;
};

const undoShortcut = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+Z");
  await waitForSyncStatus({ page, status: "idle" });
};

const redoShortcut = async ({ page }: { page: Page }) => {
  await page.keyboard.press("ControlOrMeta+Shift+Z");
  await waitForSyncStatus({ page, status: "idle" });
};

test.beforeAll(async () => {
  await setupSharedContentModeProject();
});
test("Editor can delete direct children but not protected containers", async () => {
  const fixture = getSharedContentModeProject();
  const { page, close } = await newIsolatedPage();

  try {
    await measure(
      "content mode open editor for direct child delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasText({ page, text: "Initial content" });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode insert deletable template", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.deletableTemplateName,
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.deletableTemplateText,
    });

    await measure("content mode delete direct child", async () => {
      await deleteContentBlockChildAfterCanvasText({
        page,
        text: fixture.deletableTemplateText,
      });
    });
    await waitForCanvasTextHidden({
      page,
      text: fixture.deletableTemplateText,
    });

    await measure(
      "content mode reload editor for direct child delete",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasTextHidden({
      page,
      text: fixture.deletableTemplateText,
    });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode insert nested template", async () => {
      await insertTemplateAfterCanvasText({
        page,
        anchorText: "Initial content",
        templateName: fixture.nestedTemplateName,
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.nestedTemplateText,
    });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode try nested delete", async () => {
      const canvas = await waitForCanvasFrame({ page });
      await page.keyboard.down("Alt");
      try {
        await canvas.getByText(fixture.nestedTemplateText).hover();
        await page
          .getByRole("button", { name: "Delete block" })
          .waitFor({ state: "hidden", timeout: 1_000 });
      } finally {
        await page.keyboard.up("Alt");
      }
    });
    await waitForCanvasText({
      page,
      text: fixture.nestedTemplateText,
    });
    await waitForSyncStatus({ page, status: "idle" });

    await openPagesPanel({ page });
    await expectContentModeTemplateActionsUnavailable({
      page,
      templateName: fixture.pageTemplateName,
    });

    await page.getByRole("tab", { name: "Navigator" }).click();
    await expectTextHidden({ page, text: "Global Root" });
    await expectTextHidden({ page, text: fixture.pageTemplateName });
    await waitForSyncStatus({ page, status: "idle" });
  } finally {
    await close();
  }
});

test("Editor can edit text and content props but not design props", async () => {
  const fixture = getSharedContentModeProject();
  const editedHref = "/edited-link";
  const editedImageSrc =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23dff7e8'/%3E%3C/svg%3E";
  const editedImageAlt = "Edited image alt";
  const editedImageWidth = 240;
  const editedVideoSrc = "https://example.com/edited-video.mp4";
  const editedContent = "Edited isolated content";
  const { page, close } = await newIsolatedPage();

  try {
    await measure("content mode open editor for props", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({ page, text: "Initial link" });
    await waitForSyncStatus({ page, status: "idle" });

    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.editableTextTemplateName,
    });
    await waitForCanvasText({
      page,
      text: fixture.editableTextTemplateText,
    });

    await insertTemplateAfterCanvasText({
      page,
      anchorText: fixture.editableTextTemplateText,
      templateName: fixture.contentPropsTemplateName,
    });
    await waitForCanvasText({
      page,
      text: fixture.contentPropsTemplateLinkText,
    });
    await waitForCanvasImage({
      page,
      alt: fixture.contentPropsTemplateImageAlt,
    });
    await waitForCanvasVideoSource({
      page,
      sourceName: fixture.contentPropsTemplateVideoName,
    });

    await measure("content mode edit text and save", async () => {
      await replaceCanvasText({
        page,
        currentText: fixture.editableTextTemplateText,
        text: editedContent,
      });
    });

    await selectCanvasTextInstanceForProps({
      page,
      text: "Initial link",
      propertyLabel: "Href",
    });
    await expectLocatorHidden({
      locator: page.getByRole("tab", { name: "Style" }),
      message: "Expected Style tab to be unavailable in content mode",
    });
    await expectTextHidden({ page, text: "Style sources" });
    await expectTextHidden({ page, text: "Target" });

    await selectCanvasTextInstanceForProps({
      page,
      text: fixture.contentPropsTemplateLinkText,
      propertyLabel: "Href",
    });
    await fillSelectedStringProperty({
      page,
      label: "Href",
      control: "url",
      value: editedHref,
    });

    await selectCanvasImage({
      page,
      alt: fixture.contentPropsTemplateImageAlt,
    });
    await fillSelectedStringProperty({
      page,
      label: "Source",
      control: "url",
      value: editedImageSrc,
    });
    await fillSelectedStringProperty({
      page,
      label: "Alt",
      control: "text",
      value: editedImageAlt,
    });
    await fillSelectedNumberProperty({
      page,
      label: "Width",
      value: editedImageWidth,
    });

    await selectCanvasVideoSource({
      page,
      sourceName: fixture.contentPropsTemplateVideoName,
    });
    await fillSelectedStringProperty({
      page,
      label: "Source",
      control: "url",
      value: editedVideoSrc,
    });

    await measure("content mode reload editor for props", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({
      page,
      text: fixture.contentPropsTemplateLinkText,
    });
    await waitForCanvasText({ page, text: editedContent });
    await waitForSyncStatus({ page, status: "idle" });

    await selectCanvasTextInstanceForProps({
      page,
      text: fixture.contentPropsTemplateLinkText,
      propertyLabel: "Href",
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Href",
      control: "url",
      value: editedHref,
    });

    await selectCanvasImage({
      page,
      alt: editedImageAlt,
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Source",
      control: "url",
      value: editedImageSrc,
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Alt",
      control: "text",
      value: editedImageAlt,
    });
    await waitForSelectedNumberPropertyValue({
      page,
      label: "Width",
      value: editedImageWidth,
    });

    await selectCanvasVideoSource({
      page,
      sourceName: "edited-video.mp4",
    });
    await waitForSelectedStringPropertyValue({
      page,
      label: "Source",
      control: "url",
      value: editedVideoSrc,
    });
    await waitForCanvasText({ page, text: editedContent });
  } finally {
    await close();
  }
});

test("Editor can paste text while editing canvas content", async () => {
  const fixture = getSharedContentModeProject();
  const pastedContent = "Pasted editable content";
  const { page, close } = await newIsolatedPage();

  try {
    await measure("content mode open editor for text paste", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({ page, text: "Initial content" });
    await waitForSyncStatus({ page, status: "idle" });

    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.editableTextTemplateName,
    });
    await waitForCanvasText({
      page,
      text: fixture.editableTextTemplateText,
    });

    await measure("content mode native paste text", async () => {
      await pasteCanvasText({
        page,
        currentText: fixture.editableTextTemplateText,
        text: pastedContent,
      });
    });
    await waitForCanvasText({ page, text: pastedContent });
  } finally {
    await close();
  }
});

test("Editor rich text formatting persists after reload", async () => {
  const fixture = getSharedContentModeProject();
  const formattedText = "Rich editor formatted copy";
  const editedHref = "/rich-text-editor-link";
  const { page, close } = await newIsolatedPage();

  try {
    await measure(
      "content mode open editor for rich text formatting",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasText({ page, text: fixture.shareLinkEditableText });
    await waitForSyncStatus({ page, status: "idle" });

    await measure("content mode apply rich text formatting", async () => {
      await replaceCanvasTextAndApplyInlineFormats({
        page,
        currentText: fixture.shareLinkEditableText,
        text: formattedText,
        formats: ["Bold", "Italic", "Inline link"],
      });
    });
    await waitForCanvasText({ page, text: formattedText });

    const boldCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "b",
      text: formattedText,
    });
    const italicCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "i",
      text: formattedText,
    });
    const linkCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "a",
      text: formattedText,
    });
    if (boldCount !== 1 || italicCount !== 1 || linkCount !== 1) {
      throw new Error(
        `Expected rich text editor to persist one bold, italic, and inline link subtree. bold=${boldCount}, italic=${italicCount}, link=${linkCount}`
      );
    }

    await measure("content mode undo rich text formatting", async () => {
      await undoShortcut({ page });
    });
    await waitForCanvasTextHidden({ page, text: formattedText });

    await measure("content mode redo rich text formatting", async () => {
      await redoShortcut({ page });
    });
    await waitForCanvasText({ page, text: formattedText });

    await selectCanvasTextInstanceForProps({
      page,
      text: formattedText,
      propertyLabel: "Href",
    });
    await fillSelectedStringProperty({
      page,
      label: "Href",
      control: "url",
      value: editedHref,
    });
    const savedHref = await getElementHrefWithText({
      projectId: fixture.projectId,
      text: formattedText,
    });
    if (savedHref !== editedHref) {
      throw new Error(
        `Expected rich-text link href to be saved as "${editedHref}", received "${savedHref}"`
      );
    }

    await measure("content mode reload rich text formatting", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({ page, text: formattedText });
    const reloadedHref = await getElementHrefWithText({
      projectId: fixture.projectId,
      text: formattedText,
    });
    if (reloadedHref !== editedHref) {
      throw new Error(
        `Expected reloaded rich-text link href to be "${editedHref}", received "${reloadedHref}"`
      );
    }

    const reloadedBoldCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "b",
      text: formattedText,
    });
    const reloadedItalicCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "i",
      text: formattedText,
    });
    const reloadedLinkCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "a",
      text: formattedText,
    });
    if (
      reloadedBoldCount !== 1 ||
      reloadedItalicCount !== 1 ||
      reloadedLinkCount !== 1
    ) {
      throw new Error(
        `Expected reloaded rich text formatting to persist. bold=${reloadedBoldCount}, italic=${reloadedItalicCount}, link=${reloadedLinkCount}`
      );
    }

    await removeCanvasInlineLink({ page, text: formattedText });
    const removedLinkCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "a",
      text: formattedText,
    });
    if (removedLinkCount !== 0) {
      throw new Error(
        `Expected rich-text link removal to delete the inline link subtree, received ${removedLinkCount} link instances`
      );
    }

    await measure("content mode reload rich text link removal", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.editorToken,
        mode: "content",
      });
    });
    await waitForCanvasText({ page, text: formattedText });
    const reloadedRemovedLinkCount = await getElementTagWithTextCount({
      projectId: fixture.projectId,
      tag: "a",
      text: formattedText,
    });
    if (reloadedRemovedLinkCount !== 0) {
      throw new Error(
        `Expected rich-text link removal to persist after reload, received ${reloadedRemovedLinkCount} link instances`
      );
    }
  } finally {
    await close();
  }
});
