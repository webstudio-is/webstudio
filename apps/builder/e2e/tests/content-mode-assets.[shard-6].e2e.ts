import { randomUUID } from "node:crypto";
import { loadDevBuild } from "../db";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  selectCanvasImage,
  waitForCanvasImage,
  waitForCanvasImageCount,
  waitForCanvasVideoSource,
} from "../flows/canvas-media";
import {
  waitForCanvasTextStyle,
  waitForCanvasTextStyleCount,
} from "../flows/canvas-style";
import {
  waitForChangeToBeSaved,
  waitForSyncComplete,
} from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";
import { test } from "../test";

test("Content templates persist with styles and assets, including after Builder copy/paste", async ({
  context,
  page,
}) => {
  const fixture = await createContentModeProject({
    context,
    devPlan: e2ePaidPlanName,
    email: `content-mode-assets-${randomUUID()}@webstudio.test`,
  });
  const getImageAssetReferenceCount = async () => {
    const build = await loadDevBuild({ projectId: fixture.projectId });
    const props = JSON.parse(build.props) as Array<{
      name: string;
      type: string;
      value: string;
    }>;
    const references = props.filter(
      (prop) =>
        prop.name === "src" &&
        prop.type === "asset" &&
        prop.value === fixture.assetTemplateImageAssetId
    );
    return references.length;
  };

  await measure("content mode open editor for asset template", async () => {
    await openProjectBuilder({
      page,
      projectId: fixture.projectId,
      authToken: fixture.editorToken,
      mode: "content",
    });
  });
  await waitForCanvasText({ page, text: "Initial content" });
  await waitForSyncComplete({ page });

  const initialAssetReferenceCount = await getImageAssetReferenceCount();

  // Check each insertion on the canvas, then wait for the final save before
  // opening the project as Builder and checking persistence across reloads.
  await measure("content mode insert asset template", async () => {
    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.assetTemplateName,
      waitForProjectSync: false,
    });
  });
  await waitForCanvasImage({
    page,
    alt: fixture.assetTemplateImageAlt,
  });
  await waitForCanvasVideoSource({
    page,
    sourceName: fixture.assetTemplateVideoName,
  });

  await measure("content mode insert heading template", async () => {
    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.styledHeadingTemplateName,
      waitForProjectSync: false,
    });
  });
  await waitForCanvasText({
    page,
    text: fixture.styledHeadingTemplateText,
  });
  await waitForCanvasTextStyle({
    page,
    text: fixture.styledHeadingTemplateText,
    property: "font-size",
    value: fixture.styledHeadingTemplateFontSize,
  });

  await measure("content mode insert token template", async () => {
    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.tokenTemplateLabel,
      waitForProjectSync: false,
    });
  });
  await waitForCanvasText({
    page,
    text: fixture.tokenTemplateVisibleText,
  });
  await waitForCanvasTextStyle({
    page,
    text: fixture.tokenTemplateVisibleText,
    property: "font-size",
    value: fixture.tokenTemplateFontSize,
  });

  await measure("content mode insert local style templates", async () => {
    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.isolatedLocalTemplateName,
      waitForProjectSync: false,
    });
    await insertTemplateAfterCanvasText({
      page,
      anchorText: "Initial content",
      templateName: fixture.isolatedLocalTemplateName,
    });
  });
  await waitForCanvasTextStyleCount({
    page,
    text: fixture.isolatedLocalTemplateText,
    property: "font-size",
    value: fixture.isolatedLocalTemplateFontSize,
    count: 2,
  });

  await test.step("Builder can copy and paste the inserted image and reload its asset references", async () => {
    await measure("asset copy open build mode", async () => {
      await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });
    await waitForCanvasImage({
      page,
      alt: fixture.assetTemplateImageAlt,
    });
    await selectCanvasImage({
      page,
      alt: fixture.assetTemplateImageAlt,
    });
    await page.keyboard.press("ControlOrMeta+C");
    const save = waitForChangeToBeSaved({ page });
    await page.keyboard.press("ControlOrMeta+V");
    await save;
    await waitForSyncComplete({ page });
    await waitForCanvasImageCount({
      page,
      alt: fixture.assetTemplateImageAlt,
      count: 2,
    });
    if (
      (await getImageAssetReferenceCount()) !==
      initialAssetReferenceCount + 2
    ) {
      throw new Error(
        "Expected insertion and paste to add two asset references."
      );
    }

    await measure(
      "content mode reload editor after Builder copy and paste",
      async () => {
        await openProjectBuilder({
          page,
          projectId: fixture.projectId,
          authToken: fixture.editorToken,
          mode: "content",
        });
      }
    );
    await waitForCanvasVideoSource({
      page,
      sourceName: fixture.assetTemplateVideoName,
    });
    await waitForCanvasTextStyle({
      page,
      text: fixture.styledHeadingTemplateText,
      property: "font-size",
      value: fixture.styledHeadingTemplateFontSize,
    });
    await waitForCanvasTextStyle({
      page,
      text: fixture.tokenTemplateVisibleText,
      property: "font-size",
      value: fixture.tokenTemplateFontSize,
    });
    await waitForCanvasTextStyleCount({
      page,
      text: fixture.isolatedLocalTemplateText,
      property: "font-size",
      value: fixture.isolatedLocalTemplateFontSize,
      count: 2,
    });
    await waitForSyncComplete({ page });
    await waitForCanvasImageCount({
      page,
      alt: fixture.assetTemplateImageAlt,
      count: 2,
    });
    if (
      (await getImageAssetReferenceCount()) !==
      initialAssetReferenceCount + 2
    ) {
      throw new Error("Expected reload to preserve copied asset references.");
    }
  });
});
