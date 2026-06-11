import type { Locator } from "playwright";
import { openBuilderUrl, waitForCanvasFrame } from "../flows/builder";
import { createContentModeProject } from "../fixtures/content-mode-suite";
import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";
import { getProjectBuilderUrl, newIsolatedPage, test } from "../harness";
import type { SeededContentModeProject } from "../fixtures/content-mode-project";

type PageData = {
  id: string;
  name: string;
  title: string;
  rootInstanceId: string;
  path: string;
  meta: Record<string, unknown>;
};

type PagesData = {
  homePageId: string;
  rootFolderId?: string;
  pages: PageData[];
  folders?: Array<{ id: string; children?: string[] }>;
};

type InstanceData = {
  type: "instance";
  id: string;
  component: string;
  tag?: string;
  label?: string;
  children: Array<{ type: "id" | "text"; value: string }>;
};

type PropData = {
  id: string;
  instanceId: string;
  name: string;
  type: "string";
  value: string;
};

let fixture: SeededContentModeProject;

const previewLinkText = {
  homeLink: "Preview home link",
  pageLink: "Preview page link",
  richTextLink: "Preview rich text link",
  pageAnchor: "Preview page anchor",
  pageQueryLink: "Preview page query link",
  hashLink: "Preview hash link",
} as const;
const previewPageId = "preview-links-page";
const viewerToken = "preview-links-e2e-viewer-token";

type PreviewLink = {
  key: string;
  text: string;
  href: string;
  component?: string;
  tag?: string;
};

const previewLinks: PreviewLink[] = [
  { key: "home-link", text: previewLinkText.homeLink, href: "/" },
  { key: "page-link", text: previewLinkText.pageLink, href: "/my-page" },
  {
    key: "rich-text-link",
    text: previewLinkText.richTextLink,
    href: "/my-page",
    component: "RichTextLink",
  },
  {
    key: "page-anchor",
    text: previewLinkText.pageAnchor,
    href: "/my-page",
    component: "ws:element",
    tag: "a",
  },
  {
    key: "page-query-link",
    text: previewLinkText.pageQueryLink,
    href: "/my-page?tab=details",
  },
  { key: "hash-link", text: previewLinkText.hashLink, href: "#section" },
] as const;

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

const appendChild = (
  instances: InstanceData[],
  parentId: string,
  childId: string
) => {
  const parent = instances.find((instance) => instance.id === parentId);
  if (parent === undefined) {
    throw new Error(`Expected instance "${parentId}"`);
  }
  parent.children.push({ type: "id", value: childId });
};

const addTextLink = ({
  instances,
  props,
  id,
  component = "Link",
  tag,
  text,
  href,
}: {
  instances: InstanceData[];
  props: PropData[];
  id: string;
  component?: string;
  tag?: string;
  text: string;
  href: string;
}) => {
  instances.push({
    type: "instance",
    id,
    component,
    tag,
    label: text,
    children: [{ type: "text", value: text }],
  });
  props.push({
    id: `${id}-href`,
    instanceId: id,
    name: "href",
    type: "string",
    value: href,
  });
};

const addPreviewLinks = ({
  instances,
  props,
  parentId,
  prefix,
}: {
  instances: InstanceData[];
  props: PropData[];
  parentId: string;
  prefix: string;
}) => {
  for (const link of previewLinks) {
    const id = `${prefix}-${link.key}`;
    addTextLink({
      instances,
      props,
      id,
      text: link.text,
      href: link.href,
      component: link.component,
      tag: link.tag,
    });
    appendChild(instances, parentId, id);
  }
};

const preparePreviewLinksProject = async () => {
  const build = await loadDevBuild({ projectId: fixture.projectId });
  const pages = JSON.parse(build.pages) as PagesData;
  const instances = JSON.parse(build.instances) as InstanceData[];
  const props = JSON.parse(build.props) as PropData[];

  const homePage = pages.pages.find((page) => page.id === pages.homePageId);
  if (homePage === undefined) {
    throw new Error("Expected home page");
  }
  const homeRoot = instances.find(
    (instance) => instance.id === homePage.rootInstanceId
  );
  const homeContentId = homeRoot?.children.find(
    (child) => child.type === "id"
  )?.value;
  if (homeContentId === undefined) {
    throw new Error("Expected home page content instance");
  }

  const pageRootId = "preview-links-page-root";
  const pageContentId = "preview-links-page-content";

  pages.pages.push({
    id: previewPageId,
    name: "Preview Links Page",
    title: JSON.stringify("Preview Links Page"),
    rootInstanceId: pageRootId,
    path: "/my-page",
    meta: { description: JSON.stringify("") },
  });
  pages.folders
    ?.find((folder) => folder.id === pages.rootFolderId)
    ?.children?.push(previewPageId);

  instances.push(
    {
      type: "instance",
      id: pageRootId,
      component: "ws:element",
      tag: "body",
      children: [{ type: "id", value: pageContentId }],
    },
    {
      type: "instance",
      id: pageContentId,
      component: "ws:element",
      tag: "main",
      label: "Preview Links Page Content",
      children: [],
    }
  );

  addPreviewLinks({
    instances,
    props,
    parentId: homeContentId,
    prefix: "preview-home",
  });
  addPreviewLinks({
    instances,
    props,
    parentId: pageContentId,
    prefix: "preview-page",
  });

  await updateBuild(build.id, {
    pages: JSON.stringify(pages),
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
  });
  await insertAuthorizationToken({
    token: viewerToken,
    projectId: fixture.projectId,
    name: "E2E viewer token",
    relation: "viewers",
  });
};

test.beforeAll(async () => {
  fixture = await createContentModeProject({
    email: "preview-links-e2e@webstudio.test",
    title: "Preview Links E2E",
    assetNamePrefix: "preview-links-",
    editorToken: "preview-links-e2e-editor-token",
    builderToken: "preview-links-e2e-builder-token",
  });
  await preparePreviewLinksProject();
});

test("Preview links expose current page state for components and element anchors", async () => {
  const { page, close } = await newIsolatedPage();

  try {
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

    await canvas.getByRole("link", { name: previewLinkText.pageLink }).click();
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
  } finally {
    await close();
  }
});
