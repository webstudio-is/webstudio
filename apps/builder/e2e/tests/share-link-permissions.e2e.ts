import { resetDatabase } from "../db";
import { expectLocatorHidden, expectTextHidden } from "../flows/assertions";
import { openProjectBuilder, waitForCanvasText } from "../flows/builder";
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
import { setupSharedContentModeProject } from "../fixtures/content-mode-suite";
import { newIsolatedPage, newPage, type Suite } from "../harness";
import { measure } from "../perf";
import { e2ePaidPlanName } from "../plans";

const ownerEmail = "share-link-e2e@webstudio.test";

type ShareLinkFixtures = {
  projectId: string;
  viewerUrl: string;
  editorUrl: string;
  builderUrl: string;
  adminUrl: string;
};

let links: ShareLinkFixtures | undefined;
let sharedText = "Initial content";

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

export const shareLinkPermissions: Suite = {
  name: "share link permissions",
  beforeAll: async () => {
    await resetDatabase();
    const fixture = await setupSharedContentModeProject({
      email: ownerEmail,
      title: "Share Link E2E",
      devPlan: e2ePaidPlanName,
    });
    const ownerPage = await newPage();

    try {
      await measure("share link open owner project", async () => {
        await openProjectBuilder({
          page: ownerPage,
          projectId: fixture.projectId,
        });
      });
      await waitForCanvasText({ page: ownerPage, text: sharedText });

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
        };
      });
    } finally {
      await ownerPage.close();
    }
  },
  tests: [
    {
      name: "Viewer share link opens preview without edit or share controls",
      run: async () => {
        const { viewerUrl } = getShareLinkFixtures();
        const { page, close } = await newIsolatedPage();

        try {
          expectLinkMode({ link: viewerUrl, mode: "preview" });
          await page.goto(viewerUrl);
          await waitForCanvasText({ page, text: sharedText });
          await expectShareUnavailable({ page });
          await expectTextHidden({ page, text: "No instance selected" });
          await expectLocatorHidden({
            locator: page.getByRole("tab", { name: "Style" }),
            message: "Expected Style tab to be unavailable for viewer link",
          });
        } finally {
          await close();
        }
      },
    },
    {
      name: "Editor share link opens content mode and saves content edits",
      run: async () => {
        const { editorUrl } = getShareLinkFixtures();
        const { page, close } = await newIsolatedPage();
        const editedText = "Share-link editor text";

        try {
          expectLinkMode({ link: editorUrl, mode: "content" });
          await page.goto(editorUrl);
          await waitForCanvasText({ page, text: sharedText });
          await waitForSyncStatus({ page, status: "idle" });
          expectCurrentMode({ pageUrl: page.url(), mode: "content" });

          await replaceCanvasText({
            page,
            currentText: sharedText,
            text: editedText,
          });
          sharedText = editedText;

          await page.goto(editorUrl);
          await waitForCanvasText({ page, text: sharedText });
          await waitForSyncStatus({ page, status: "idle" });
          await expectShareUnavailable({ page });

          await selectCanvasTextInstanceForProps({
            page,
            text: "Initial link",
            propertyLabel: "Href",
          });
          await expectLocatorHidden({
            locator: page.getByRole("tab", { name: "Style" }),
            message: "Expected Style tab to be unavailable for editor link",
          });
        } finally {
          await close();
        }
      },
    },
    {
      name: "Builder share link opens design mode but cannot share",
      run: async () => {
        const { builderUrl } = getShareLinkFixtures();
        const { page, close } = await newIsolatedPage();

        try {
          expectLinkMode({ link: builderUrl, mode: "design" });
          await page.goto(builderUrl);
          await waitForCanvasText({ page, text: sharedText });
          await waitForSyncStatus({ page, status: "idle" });
          await expectShareUnavailable({ page });

          await selectCanvasTextInstance({ page, text: sharedText });
          await page
            .getByRole("tab", { name: "Style" })
            .waitFor({ state: "visible", timeout: 10_000 });
        } finally {
          await close();
        }
      },
    },
    {
      name: "Admin share link opens design mode with publish access but cannot share",
      run: async () => {
        const { adminUrl } = getShareLinkFixtures();
        const { page, close } = await newIsolatedPage();

        try {
          expectLinkMode({ link: adminUrl, mode: "design" });
          await page.goto(adminUrl);
          await waitForCanvasText({ page, text: sharedText });
          await waitForSyncStatus({ page, status: "idle" });
          await expectShareUnavailable({ page });

          const publishButton = page.getByRole("button", { name: "Publish" });
          await publishButton.waitFor({ state: "visible", timeout: 10_000 });
          if (await publishButton.isDisabled()) {
            throw new Error("Expected admin share link to allow publishing");
          }
        } finally {
          await close();
        }
      },
    },
    {
      name: "Owner can update share link role through the UI",
      run: async () => {
        const { projectId } = getShareLinkFixtures();
        const ownerPage = await newPage();
        const visitor = await newIsolatedPage();

        try {
          await loginWithSecret({ page: ownerPage, email: ownerEmail });
          await openProjectBuilder({ page: ownerPage, projectId });
          await waitForCanvasText({ page: ownerPage, text: sharedText });

          await openShareDialog({ page: ownerPage });
          await createShareLink({
            page: ownerPage,
            name: "E2E Updated link",
            role: "Viewer",
          });
          const viewerUrl = await copyShareLink({
            page: ownerPage,
            name: "E2E Updated link",
          });
          expectLinkMode({ link: viewerUrl, mode: "preview" });

          await visitor.page.goto(viewerUrl);
          await waitForCanvasText({ page: visitor.page, text: sharedText });
          await expectLocatorHidden({
            locator: visitor.page.getByRole("tab", { name: "Style" }),
            message: "Expected updated link to start as viewer",
          });

          await updateShareLinkRole({
            page: ownerPage,
            name: "E2E Updated link",
            role: "Builder",
          });
          const builderUrl = await copyShareLink({
            page: ownerPage,
            name: "E2E Updated link",
          });
          expectLinkMode({ link: builderUrl, mode: "design" });

          await visitor.page.goto(builderUrl);
          await waitForCanvasText({ page: visitor.page, text: sharedText });
          await selectCanvasTextInstance({
            page: visitor.page,
            text: sharedText,
          });
          await visitor.page
            .getByRole("tab", { name: "Style" })
            .waitFor({ state: "visible", timeout: 10_000 });
        } finally {
          await ownerPage.close();
          await visitor.close();
        }
      },
    },
  ],
};
