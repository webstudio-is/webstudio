import { loadDevBuild, updateBuild } from "../db";

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

export const previewLinkText = {
  homeLink: "Preview home link",
  pageLink: "Preview page link",
  richTextLink: "Preview rich text link",
  pageAnchor: "Preview page anchor",
  pageQueryLink: "Preview page query link",
  hashLink: "Preview hash link",
} as const;
export const previewPageId = "preview-links-page";

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

export const preparePreviewLinksProject = async (projectId: string) => {
  const build = await loadDevBuild({ projectId });
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
};
