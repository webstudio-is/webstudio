import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";

export type SeededContentModeProject = {
  projectId: string;
  buildId: string;
  editorToken: string;
  initialVersion: number;
  listItemInstanceId: string;
  linkInstanceId: string;
  imageInstanceId: string;
  videoInstanceId: string;
};

const createContentModeBuildData = ({
  listItemInstanceId,
  linkInstanceId,
  imageInstanceId,
  videoInstanceId,
  pages,
  breakpoints = JSON.stringify([]),
}: {
  listItemInstanceId: string;
  linkInstanceId: string;
  imageInstanceId: string;
  videoInstanceId: string;
  pages: string;
  breakpoints?: string;
}) => {
  const rootInstanceId = "body";
  const contentBlockId = "content-block";
  const contentBlockTemplateId = "content-block-template";
  const instances = [
    {
      type: "instance",
      id: rootInstanceId,
      component: "ws:element",
      tag: "body",
      children: [{ type: "id", value: contentBlockId }],
    },
    {
      type: "instance",
      id: contentBlockId,
      component: "ws:block",
      children: [
        { type: "id", value: listItemInstanceId },
        { type: "id", value: linkInstanceId },
        { type: "id", value: imageInstanceId },
        { type: "id", value: videoInstanceId },
        { type: "id", value: contentBlockTemplateId },
      ],
    },
    {
      type: "instance",
      id: contentBlockTemplateId,
      component: "ws:block-template",
      children: [],
    },
    {
      type: "instance",
      id: listItemInstanceId,
      component: "ws:element",
      tag: "h1",
      label: "Heading",
      children: [{ type: "text", value: "Initial content" }],
    },
    {
      type: "instance",
      id: linkInstanceId,
      component: "Link",
      label: "Link",
      children: [{ type: "text", value: "Initial link" }],
    },
    {
      type: "instance",
      id: imageInstanceId,
      component: "Image",
      label: "Image",
      children: [],
    },
    {
      type: "instance",
      id: videoInstanceId,
      component: "Video",
      label: "Video",
      children: [],
    },
  ];

  const props = [
    {
      id: "link-href-prop",
      instanceId: linkInstanceId,
      name: "href",
      type: "string",
      value: "/initial-link",
    },
    {
      id: "image-src-prop",
      instanceId: imageInstanceId,
      name: "src",
      type: "string",
      value:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23d9e4ff'/%3E%3C/svg%3E",
    },
    {
      id: "image-width-prop",
      instanceId: imageInstanceId,
      name: "width",
      type: "number",
      value: 120,
    },
    {
      id: "image-height-prop",
      instanceId: imageInstanceId,
      name: "height",
      type: "number",
      value: 80,
    },
    {
      id: "image-alt-prop",
      instanceId: imageInstanceId,
      name: "alt",
      type: "string",
      value: "Initial image alt",
    },
    {
      id: "video-src-prop",
      instanceId: videoInstanceId,
      name: "src",
      type: "string",
      value: "https://example.com/initial-video.mp4",
    },
    {
      id: "video-width-prop",
      instanceId: videoInstanceId,
      name: "width",
      type: "number",
      value: 120,
    },
    {
      id: "video-height-prop",
      instanceId: videoInstanceId,
      name: "height",
      type: "number",
      value: 80,
    },
  ];

  const nextPages = JSON.parse(pages) as {
    homePageId: string;
    pages: Array<{ id: string; rootInstanceId: string }>;
  };
  const homePage = nextPages.pages.find(
    (page) => page.id === nextPages.homePageId
  );
  if (homePage === undefined) {
    throw new Error("Expected existing build to have a home page");
  }
  homePage.rootInstanceId = rootInstanceId;

  return {
    pages: JSON.stringify(nextPages),
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
    styleSources: JSON.stringify([]),
    styleSourceSelections: JSON.stringify([]),
    styles: JSON.stringify([]),
    breakpoints,
    dataSources: JSON.stringify([]),
    resources: JSON.stringify([]),
    marketplaceProduct: JSON.stringify({}),
  };
};

export const prepareExistingContentModeProject = async ({
  projectId,
  editorToken = "e2e-editor-token",
  listItemInstanceId = "list-item",
  linkInstanceId = "content-link",
  imageInstanceId = "content-image",
  videoInstanceId = "content-video",
}: {
  projectId: string;
  editorToken?: string;
  listItemInstanceId?: string;
  linkInstanceId?: string;
  imageInstanceId?: string;
  videoInstanceId?: string;
}): Promise<SeededContentModeProject> => {
  const build = await loadDevBuild({ projectId });

  await updateBuild(build.id, {
    version: 0,
    ...createContentModeBuildData({
      listItemInstanceId,
      linkInstanceId,
      imageInstanceId,
      videoInstanceId,
      pages: build.pages,
      breakpoints: build.breakpoints,
    }),
  });

  await insertAuthorizationToken({
    token: editorToken,
    projectId,
    name: "E2E editor token",
    relation: "editors",
  });

  return {
    projectId,
    buildId: build.id,
    editorToken,
    initialVersion: 0,
    listItemInstanceId,
    linkInstanceId,
    imageInstanceId,
    videoInstanceId,
  };
};
