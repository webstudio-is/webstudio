import { resetDatabase } from "../db";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
import { replaceCanvasText } from "../flows/content-editing";
import { waitForSyncStatus } from "../flows/sync-status";
import {
  getSharedContentModeProject,
  setupSharedContentModeProject,
} from "../fixtures/content-mode-suite";
import { newIsolatedPage, type Suite } from "../harness";
import { measure } from "../perf";

export const contentModeEditExistingText: Suite = {
  name: "content mode existing text editing",
  beforeAll: async () => {
    await resetDatabase();
    await setupSharedContentModeProject();
  },
  tests: [
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
