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
import { loginWithSecret } from "../flows/dashboard";
import {
  copyShareLink,
  createShareLink,
  expectShareUnavailable,
  openShareDialog,
  updateShareLinkRole,
} from "../flows/share-dialog";
import { waitForSyncStatus } from "../flows/sync-status";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, newPage, test } from "../harness";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";

const ownerEmail = "share-link-e2e@webstudio.test";
const baselineText = "Initial content";

type ShareLinkFixtures = {
  projectId: string;
  viewerUrl: string;
  editorUrl: string;
  builderUrl: string;
  adminUrl: string;
  shareLinkEditableText: string;
};

let links: ShareLinkFixtures | undefined;

const getShareLinkFixtures = () => {
  if (links === undefined) {
    throw new Error("Expected share-link fixtures to be initialized");
  }
  return links;
};

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

test.beforeAll(async () => {
  const fixture = await createContentModeProject({
    email: ownerEmail,
    title: "Share Link E2E",
    devPlan: e2ePaidPlanName,
    assetNamePrefix: "share-link-",
    editorToken: "share-link-e2e-editor-token",
    builderToken: "share-link-e2e-builder-token",
  });
  const ownerPage = await newPage();

  try {
    await measure("share link open owner project", async () => {
      await openProjectBuilder({
        page: ownerPage,
        projectId: fixture.projectId,
      });
    });
    await waitForCanvasText({ page: ownerPage, text: baselineText });

    await measure("share link create links", async () => {
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

      links = {
        projectId: fixture.projectId,
        viewerUrl,
        editorUrl,
        builderUrl,
        adminUrl,
        shareLinkEditableText: fixture.shareLinkEditableText,
      };
    });
  } finally {
    await ownerPage.close();
  }
});
test("Share links enforce viewer, editor, builder, admin, and owner permissions", async () => {
  const {
    projectId,
    viewerUrl,
    editorUrl,
    builderUrl,
    adminUrl,
    shareLinkEditableText,
  } = getShareLinkFixtures();
  const viewer = await newIsolatedPage();
  const editor = await newIsolatedPage();
  const builderPage = await newIsolatedPage();
  const admin = await newIsolatedPage();
  const ownerPage = await newPage();
  const visitor = await newIsolatedPage();
  const editedText = "Share-link editor text";

  try {
    expectLinkMode({ link: viewerUrl, mode: "preview" });
    expectLinkMode({ link: editorUrl, mode: "content" });
    expectLinkMode({ link: builderUrl, mode: "design" });
    expectLinkMode({ link: adminUrl, mode: "design" });

    await Promise.all([
      (async () => {
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
      })(),
      (async () => {
        await openBuilderUrl({ page: builderPage.page, url: builderUrl });
        await waitForCanvasText({
          page: builderPage.page,
          text: baselineText,
        });
        await waitForSyncStatus({ page: builderPage.page, status: "idle" });
        await expectShareUnavailable({ page: builderPage.page });

        await selectCanvasTextInstance({
          page: builderPage.page,
          text: baselineText,
        });
        await builderPage.page
          .getByRole("tab", { name: "Style" })
          .waitFor({ state: "visible", timeout: 10_000 });
      })(),
      (async () => {
        await openBuilderUrl({ page: admin.page, url: adminUrl });
        await waitForCanvasText({ page: admin.page, text: baselineText });
        await waitForSyncStatus({ page: admin.page, status: "idle" });
        await expectShareUnavailable({ page: admin.page });

        const publishButton = admin.page.getByRole("button", {
          name: "Publish",
        });
        await publishButton.waitFor({ state: "visible", timeout: 10_000 });
        if (await publishButton.isDisabled()) {
          throw new Error("Expected admin share link to allow publishing");
        }
      })(),
    ]);

    await openBuilderUrl({ page: editor.page, url: editorUrl });
    await waitForCanvasText({ page: editor.page, text: baselineText });
    await waitForSyncStatus({ page: editor.page, status: "idle" });
    expectCurrentMode({ pageUrl: editor.page.url(), mode: "content" });

    await waitForCanvasText({ page: editor.page, text: shareLinkEditableText });
    await replaceCanvasText({
      page: editor.page,
      currentText: shareLinkEditableText,
      text: editedText,
    });

    await openBuilderUrl({ page: editor.page, url: editorUrl });
    await waitForCanvasText({ page: editor.page, text: editedText });
    await waitForSyncStatus({ page: editor.page, status: "idle" });
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

    await loginWithSecret({ page: ownerPage, email: ownerEmail });
    await openProjectBuilder({ page: ownerPage, projectId });
    await waitForCanvasText({ page: ownerPage, text: baselineText });

    await openShareDialog({ page: ownerPage });
    await createShareLink({
      page: ownerPage,
      name: "E2E Updated link",
      role: "Viewer",
    });
    const updatedViewerUrl = await copyShareLink({
      page: ownerPage,
      name: "E2E Updated link",
    });
    expectLinkMode({ link: updatedViewerUrl, mode: "preview" });

    await openBuilderUrl({ page: visitor.page, url: updatedViewerUrl });
    await waitForCanvasText({ page: visitor.page, text: baselineText });
    await expectLocatorHidden({
      locator: visitor.page.getByRole("tab", { name: "Style" }),
      message: "Expected updated link to start as viewer",
    });

    await updateShareLinkRole({
      page: ownerPage,
      name: "E2E Updated link",
      role: "Builder",
    });
    const updatedBuilderUrl = await copyShareLink({
      page: ownerPage,
      name: "E2E Updated link",
    });
    expectLinkMode({ link: updatedBuilderUrl, mode: "design" });

    await openBuilderUrl({ page: visitor.page, url: updatedBuilderUrl });
    await waitForCanvasText({ page: visitor.page, text: baselineText });
    await selectCanvasTextInstance({
      page: visitor.page,
      text: baselineText,
    });
    await visitor.page
      .getByRole("tab", { name: "Style" })
      .waitFor({ state: "visible", timeout: 10_000 });
  } finally {
    await viewer.close();
    await editor.close();
    await builderPage.close();
    await admin.close();
    await ownerPage.close();
    await visitor.close();
  }
});
