import { expect, type Locator } from "@playwright/test";
import {
  getCanvasFrame,
  openBuilderUrl,
  waitForCanvasFrame,
} from "../flows/builder";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { insertAuthorizationToken } from "../db";
import {
  preparePreviewLinksProject,
  previewLinkText,
  previewPageId,
} from "../fixtures/preview-links-project";
import { getProjectBuilderUrl, test, withBrowserContext } from "../test";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";

let fixture: SeededContentModeProject;
const viewerToken = "preview-links-e2e-viewer-token";

const getPreviewUrl = ({
  pageId,
  hash,
}: {
  pageId?: string;
  hash?: string;
}) => {
  const url = new URL(
    getProjectBuilderUrl({
      projectId: fixture.projectId,
      authToken: viewerToken,
      mode: "preview",
    })
  );
  if (pageId !== undefined) {
    url.searchParams.set("pageId", pageId);
  }
  if (hash !== undefined) {
    url.searchParams.set("pageHash", hash);
  }
  return url.href;
};

const expectActiveLink = async ({
  canvas,
  text,
  active,
}: {
  canvas: Awaited<ReturnType<typeof waitForCanvasFrame>>;
  text: string;
  active: boolean;
}) => {
  const link = canvas.getByRole("link", { name: text });
  await link.waitFor({ state: "visible" });
  await expectLinkAttribute(link, "aria-current", active ? "page" : null);
  await expectLinkClass(link, active);
};

const expectLinkAttribute = async (
  locator: Locator,
  name: string,
  expected: string | null
) => {
  const actual = await locator.getAttribute(name);
  if (actual !== expected) {
    throw new Error(`Expected ${name}=${expected}, got ${actual}`);
  }
};

const expectLinkClass = async (locator: Locator, active: boolean) => {
  const className = (await locator.getAttribute("class")) ?? "";
  const classList = className.split(/\s+/).filter(Boolean);
  const hasActiveClass = classList.includes("active");
  if (hasActiveClass !== active) {
    throw new Error(
      `Expected active class=${active}, got class="${className}"`
    );
  }
};

test.beforeAll(async ({ browser }) => {
  await withBrowserContext(browser, async (context) => {
    fixture = await createContentModeProject({
      context,
      email: "preview-links-e2e@webstudio.test",
      title: "Preview Links E2E",
      assetNamePrefix: "preview-links-",
      editorToken: "preview-links-e2e-editor-token",
      builderToken: "preview-links-e2e-builder-token",
    });
    await preparePreviewLinksProject(fixture.projectId);
    await insertAuthorizationToken({
      token: viewerToken,
      projectId: fixture.projectId,
      name: "E2E viewer token",
      relation: "viewers",
    });
  });
});

test("Preview links expose current page state for components and element anchors", async ({
  page,
}) => {
  await openBuilderUrl({ page, url: getPreviewUrl({}) });
  let canvas = await waitForCanvasFrame({ page });
  await expectActiveLink({
    canvas,
    text: previewLinkText.homeLink,
    active: true,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageLink,
    active: false,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.richTextLink,
    active: false,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageAnchor,
    active: false,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageQueryLink,
    active: false,
  });

  const previousCanvas = canvas;
  await canvas.getByRole("link", { name: previewLinkText.pageLink }).click();
  expect(await getCanvasFrame(page)).toBe(previousCanvas);
  canvas = await waitForCanvasFrame({ page });
  await expectActiveLink({
    canvas,
    text: previewLinkText.homeLink,
    active: false,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageLink,
    active: true,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.richTextLink,
    active: true,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageAnchor,
    active: true,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageQueryLink,
    active: false,
  });

  await canvas
    .getByRole("link", { name: previewLinkText.pageQueryLink })
    .click();
  canvas = await waitForCanvasFrame({ page });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageLink,
    active: false,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.richTextLink,
    active: false,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageAnchor,
    active: false,
  });
  await expectActiveLink({
    canvas,
    text: previewLinkText.pageQueryLink,
    active: true,
  });

  await openBuilderUrl({
    page,
    url: getPreviewUrl({ pageId: previewPageId, hash: "#section" }),
  });
  canvas = await waitForCanvasFrame({ page });
  await expectActiveLink({
    canvas,
    text: previewLinkText.hashLink,
    active: true,
  });
});
