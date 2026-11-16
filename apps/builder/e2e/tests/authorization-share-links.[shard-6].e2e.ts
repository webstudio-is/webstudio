import { expectLocatorHidden, expectTextHidden } from "../flows/assertions";
import {
  openBuilderUrl,
  openProjectBuilder,
  waitForCanvasText,
} from "../flows/builder";
import {
  selectCanvasTextInstance,
  selectCanvasTextInstanceForProps,
} from "../flows/canvas-selection";
import { replaceCanvasText } from "../flows/content-editing";
import {
  copyShareLink,
  createShareLink,
  expectShareUnavailable,
  openShareDialog,
  updateShareLinkRole,
} from "../flows/share-dialog";
import { waitForSyncComplete } from "../flows/sync-status";
import { insertTemplateAfterCanvasText } from "../flows/template-insertion";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, test } from "../test";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";

const ownerEmail = "share-link-e2e@webstudio.test";
const baselineText = "Initial content";
const expectLinkMode = ({
  link,
  mode,
}: {
  link: string;
  mode: "preview" | "content" | "design";
}) => {
  const actualMode = new URL(link).searchParams.get("mode");
  if (actualMode !== mode) {
    throw new Error(`Expected share link mode ${mode}, received ${actualMode}`);
  }
};

const expectCurrentMode = ({
  pageUrl,
  mode,
}: {
  pageUrl: string;
  mode: "preview" | "content" | "design";
}) => {
  const actualMode = new URL(pageUrl).searchParams.get("mode");
  if (mode === "design") {
    if (actualMode !== null) {
      throw new Error(`Expected current mode design, received ${actualMode}`);
    }
    return;
  }
  if (actualMode !== mode) {
    throw new Error(`Expected current mode ${mode}, received ${actualMode}`);
  }
};

test("Share links enforce viewer, editor, builder, admin, and owner permissions", async ({
  browser,
  context,
  page: ownerPage,
}) => {
  const fixture = await createContentModeProject({
    context,
    email: ownerEmail,
    title: "Share Link E2E",
    devPlan: e2ePaidPlanName,
    assetNamePrefix: "share-link-",
    editorToken: "share-link-e2e-editor-token",
    builderToken: "share-link-e2e-builder-token",
  });
  await measure("share link open owner project", async () => {
    await openProjectBuilder({
      page: ownerPage,
      projectId: fixture.projectId,
    });
  });
  await waitForCanvasText({ page: ownerPage, text: baselineText });

  const { viewerUrl, editorUrl, builderUrl, adminUrl } = await measure(
    "share link create links",
    async () => {
      await openShareDialog({ page: ownerPage });
      await createShareLink({
        page: ownerPage,
        name: "E2E Viewer link",
        role: "Viewer",
      });
      const viewerUrl = await copyShareLink({
        page: ownerPage,
        name: "E2E Viewer link",
      });

      await createShareLink({
        page: ownerPage,
        name: "E2E Editor link",
        role: "Editor",
      });
      const editorUrl = await copyShareLink({
        page: ownerPage,
        name: "E2E Editor link",
      });

      await createShareLink({
        page: ownerPage,
        name: "E2E Builder link",
        role: "Builder",
      });
      const builderUrl = await copyShareLink({
        page: ownerPage,
        name: "E2E Builder link",
      });

      await createShareLink({
        page: ownerPage,
        name: "E2E Admin link",
        role: "Admin",
      });
      const adminUrl = await copyShareLink({
        page: ownerPage,
        name: "E2E Admin link",
      });

      return { viewerUrl, editorUrl, builderUrl, adminUrl };
    }
  );
  const viewer = await newIsolatedPage(browser);
  const editor = await newIsolatedPage(browser);
  const builderPage = await newIsolatedPage(browser);
  const admin = await newIsolatedPage(browser);
  const editedText = "Share-link editor text";
  const collaborativeText = "Collaborative editor text";

  try {
    expectLinkMode({ link: viewerUrl, mode: "preview" });
    expectLinkMode({ link: editorUrl, mode: "content" });
    expectLinkMode({ link: builderUrl, mode: "design" });
    expectLinkMode({ link: adminUrl, mode: "design" });

    await Promise.all([
      test.step("Viewer can view and gains design controls after the owner changes the same link", async () => {
        await openBuilderUrl({ page: viewer.page, url: viewerUrl });
        await waitForCanvasText({ page: viewer.page, text: baselineText });
        await expectShareUnavailable({ page: viewer.page });
        await expectTextHidden({
          page: viewer.page,
          text: "No instance selected",
        });
        await expectLocatorHidden({
          locator: viewer.page.getByRole("tab", { name: "Style" }),
          message: "Expected Style tab to be unavailable for viewer link",
        });
        await updateShareLinkRole({
          page: ownerPage,
          name: "E2E Viewer link",
          role: "Builder",
        });
        const updatedBuilderUrl = await copyShareLink({
          page: ownerPage,
          name: "E2E Viewer link",
        });
        expectLinkMode({ link: updatedBuilderUrl, mode: "design" });

        await openBuilderUrl({ page: viewer.page, url: updatedBuilderUrl });
        await waitForCanvasText({ page: viewer.page, text: baselineText });
        await expectShareUnavailable({ page: viewer.page });
        await selectCanvasTextInstance({
          page: viewer.page,
          text: baselineText,
        });
        await viewer.page
          .getByRole("tab", { name: "Style" })
          .waitFor({ state: "visible", timeout: 10_000 });
      }),
      test.step("Admin may publish", async () => {
        await openBuilderUrl({ page: admin.page, url: adminUrl });
        await waitForCanvasText({ page: admin.page, text: baselineText });
        await waitForSyncComplete({ page: admin.page });
        await expectShareUnavailable({ page: admin.page });

        const publishButton = admin.page.getByRole("button", {
          name: "Publish",
        });
        await publishButton.waitFor({ state: "visible", timeout: 10_000 });
        if (await publishButton.isDisabled()) {
          throw new Error("Expected admin share link to allow publishing");
        }
      }),
      test.step("Editor can save content and collaborate with a Builder", async () => {
        await openBuilderUrl({ page: editor.page, url: editorUrl });
        await waitForCanvasText({ page: editor.page, text: baselineText });
        await waitForSyncComplete({ page: editor.page });
        expectCurrentMode({ pageUrl: editor.page.url(), mode: "content" });

        await insertTemplateAfterCanvasText({
          page: editor.page,
          anchorText: baselineText,
          templateName: fixture.collaborationTemplateName,
        });
        await waitForCanvasText({
          page: editor.page,
          text: fixture.collaborationTemplateText,
        });
        await openBuilderUrl({ page: builderPage.page, url: builderUrl });
        await waitForCanvasText({
          page: builderPage.page,
          text: baselineText,
        });
        await waitForSyncComplete({ page: builderPage.page });
        await expectShareUnavailable({ page: builderPage.page });

        await selectCanvasTextInstance({
          page: builderPage.page,
          text: baselineText,
        });
        await builderPage.page
          .getByRole("tab", { name: "Style" })
          .waitFor({ state: "visible", timeout: 10_000 });

        await waitForCanvasText({
          page: builderPage.page,
          text: fixture.collaborationTemplateText,
        });
        await waitForCanvasText({
          page: editor.page,
          text: fixture.shareLinkEditableText,
        });
        await replaceCanvasText({
          page: editor.page,
          currentText: fixture.shareLinkEditableText,
          text: editedText,
          waitForProjectSync: false,
        });

        await replaceCanvasText({
          page: editor.page,
          currentText: fixture.collaborationTemplateText,
          text: collaborativeText,
        });
        await selectCanvasTextInstance({
          page: editor.page,
          text: collaborativeText,
        });
        await expectLocatorHidden({
          locator: editor.page.getByRole("tab", { name: "Style" }),
          message:
            "Expected edit-only collaborator to be blocked from design controls",
        });

        await Promise.all([
          (async () => {
            await openBuilderUrl({ page: editor.page, url: editorUrl });
            await waitForCanvasText({ page: editor.page, text: editedText });
            await waitForCanvasText({
              page: editor.page,
              text: collaborativeText,
            });
            await waitForSyncComplete({ page: editor.page });
            await expectShareUnavailable({ page: editor.page });

            await selectCanvasTextInstanceForProps({
              page: editor.page,
              text: "Initial link",
              propertyLabel: "Href",
            });
            await expectLocatorHidden({
              locator: editor.page.getByRole("tab", { name: "Style" }),
              message: "Expected Style tab to be unavailable for editor link",
            });
          })(),
          (async () => {
            await openBuilderUrl({ page: builderPage.page, url: builderUrl });
            await waitForCanvasText({
              page: builderPage.page,
              text: collaborativeText,
            });
            await selectCanvasTextInstance({
              page: builderPage.page,
              text: collaborativeText,
            });
            await builderPage.page
              .getByRole("tab", { name: "Style" })
              .waitFor({ state: "visible" });
            await waitForSyncComplete({ page: builderPage.page });
          })(),
        ]);
      }),
    ]);
  } finally {
    await viewer.close();
    await editor.close();
    await builderPage.close();
    await admin.close();
  }
});
