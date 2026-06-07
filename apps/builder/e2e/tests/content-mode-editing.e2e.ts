import { resetDatabase } from "../db";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import {
  selectCanvasInstance,
  selectCanvasTextInstanceForProps,
} from "../flows/canvas-selection";
import {
  waitForCanvasImage,
  waitForCanvasVideoSource,
} from "../flows/canvas-media";
import { replaceCanvasText } from "../flows/content-editing";
import {
  fillSelectedStringProperty,
  waitForSelectedStringPropertyValue,
} from "../flows/props-panel";
import { waitForSyncStatus } from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import {
  getSharedContentModeProject,
  setupSharedContentModeProject,
} from "../fixtures/content-mode-suite";
import { newIsolatedPage, type Suite } from "../harness";
import { measure } from "../perf";

export const contentModeEditing: Suite = {
  name: "content mode editing",
  beforeAll: async () => {
    await resetDatabase();
    await setupSharedContentModeProject();
  },
  tests: [
    {
      name: "Editor can insert template with asset props",
      run: async () => {
        const fixture = getSharedContentModeProject();
        const { page, close } = await newIsolatedPage();

        try {
          await measure(
            "content mode open editor for asset template",
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

          await measure("content mode insert asset template", async () => {
            await insertTemplateAfterCanvasText({
              page,
              anchorText: "Initial content",
              templateName: fixture.assetTemplateName,
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

          await measure(
            "content mode reload editor for asset template",
            async () => {
              await openProjectBuilder({
                page,
                projectId: fixture.projectId,
                authToken: fixture.editorToken,
                mode: "content",
              });
            }
          );
          await waitForCanvasImage({
            page,
            alt: fixture.assetTemplateImageAlt,
          });
          await waitForCanvasVideoSource({
            page,
            sourceName: fixture.assetTemplateVideoName,
          });
          await waitForSyncStatus({ page, status: "idle" });
        } finally {
          await close();
        }
      },
    },
    {
      name: "Editor can edit existing content props",
      run: async () => {
        const fixture = getSharedContentModeProject();
        const editedHref = "/edited-link";
        const editedImageSrc =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23dff7e8'/%3E%3C/svg%3E";
        const editedImageAlt = "Edited image alt";
        const editedVideoSrc = "https://example.com/edited-video.mp4";
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

          await selectCanvasTextInstanceForProps({
            page,
            text: "Initial link",
            propertyLabel: "Href",
          });
          await fillSelectedStringProperty({
            page,
            label: "Href",
            control: "url",
            value: editedHref,
          });

          await selectCanvasInstance({
            page,
            instanceId: fixture.imageInstanceId,
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

          await selectCanvasInstance({
            page,
            instanceId: fixture.videoInstanceId,
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
          await waitForCanvasText({ page, text: "Initial link" });
          await waitForSyncStatus({ page, status: "idle" });

          await selectCanvasTextInstanceForProps({
            page,
            text: "Initial link",
            propertyLabel: "Href",
          });
          await waitForSelectedStringPropertyValue({
            page,
            label: "Href",
            control: "url",
            value: editedHref,
          });

          await selectCanvasInstance({
            page,
            instanceId: fixture.imageInstanceId,
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

          await selectCanvasInstance({
            page,
            instanceId: fixture.videoInstanceId,
          });
          await waitForSelectedStringPropertyValue({
            page,
            label: "Source",
            control: "url",
            value: editedVideoSrc,
          });
        } finally {
          await close();
        }
      },
    },
    {
      name: "Editor can edit existing text",
      run: async () => {
        const fixture = getSharedContentModeProject();
        const editedContent = "Edited content";
        const { page, close } = await newIsolatedPage();

        try {
          await measure("content mode open editor", async () => {
            await openProjectBuilder({
              page,
              projectId: fixture.projectId,
              authToken: fixture.editorToken,
              mode: "content",
            });
          });
          await waitForCanvasText({ page, text: "Initial content" });
          await waitForSyncStatus({ page, status: "idle" });

          await measure("content mode edit text and save", async () => {
            await replaceCanvasText({
              page,
              currentText: "Initial content",
              text: editedContent,
            });
          });

          await measure("content mode reload editor", async () => {
            await openProjectBuilder({
              page,
              projectId: fixture.projectId,
              authToken: fixture.editorToken,
              mode: "content",
            });
          });
          await waitForCanvasText({ page, text: editedContent });
          await waitForSyncStatus({ page, status: "idle" });
        } finally {
          await close();
        }
      },
    },
  ],
};
