import {
  insertAsset,
  insertAuthorizationToken,
  insertFile,
  loadDevBuild,
  updateBuild,
} from "../db";

export type SeededContentModeProject = {
  projectId: string;
  buildId: string;
  editorToken: string;
  initialVersion: number;
  listItemInstanceId: string;
  linkInstanceId: string;
  imageInstanceId: string;
  videoInstanceId: string;
  assetTemplateName: string;
  assetTemplateImageAlt: string;
  assetTemplateVideoName: string;
  styledHeadingTemplateName: string;
  styledHeadingTemplateText: string;
  styledHeadingTemplateFontSize: string;
};

const assetTemplateName = "Asset Template";
const assetTemplateImageAlt = "Template asset image";
const assetTemplateImageName = "template-image.svg";
const assetTemplateVideoName = "template-video.mp4";
const assetTemplateImageAssetId = "asset-template-image-asset";
const assetTemplateVideoAssetId = "asset-template-video-asset";
const styledHeadingTemplateName = "Styled Heading Template";
const styledHeadingTemplateText = "Styled template heading";
const styledHeadingTemplateFontSize = "32px";

const getBaseBreakpointId = (breakpoints: string) => {
  const parsedBreakpoints = JSON.parse(breakpoints) as Array<{
    id: string;
    minWidth?: number;
    maxWidth?: number;
  }>;
  return (
    parsedBreakpoints.find(
      (breakpoint) =>
        breakpoint.minWidth === undefined && breakpoint.maxWidth === undefined
    )?.id ??
    parsedBreakpoints.at(0)?.id ??
    "base"
  );
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
  const assetTemplateId = "asset-template";
  const assetTemplateImageInstanceId = "asset-template-image";
  const assetTemplateVideoInstanceId = "asset-template-video";
  const styledHeadingTemplateId = "styled-heading-template";
  const styledHeadingTemplateLocalStyleSourceId =
    "styled-heading-template-local-style-source";
  const baseBreakpointId = getBaseBreakpointId(breakpoints);
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
      children: [
        { type: "id", value: assetTemplateId },
        { type: "id", value: styledHeadingTemplateId },
      ],
    },
    {
      type: "instance",
      id: assetTemplateId,
      component: "ws:element",
      tag: "section",
      label: assetTemplateName,
      children: [
        { type: "id", value: assetTemplateImageInstanceId },
        { type: "id", value: assetTemplateVideoInstanceId },
      ],
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
    {
      type: "instance",
      id: assetTemplateImageInstanceId,
      component: "Image",
      label: "Template Image",
      children: [],
    },
    {
      type: "instance",
      id: assetTemplateVideoInstanceId,
      component: "Video",
      label: "Template Video",
      children: [],
    },
    {
      type: "instance",
      id: styledHeadingTemplateId,
      component: "ws:element",
      tag: "h2",
      label: styledHeadingTemplateName,
      children: [{ type: "text", value: styledHeadingTemplateText }],
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
    {
      id: "asset-template-image-src-prop",
      instanceId: assetTemplateImageInstanceId,
      name: "src",
      type: "asset",
      value: assetTemplateImageAssetId,
    },
    {
      id: "asset-template-image-width-prop",
      instanceId: assetTemplateImageInstanceId,
      name: "width",
      type: "asset",
      value: assetTemplateImageAssetId,
    },
    {
      id: "asset-template-image-height-prop",
      instanceId: assetTemplateImageInstanceId,
      name: "height",
      type: "asset",
      value: assetTemplateImageAssetId,
    },
    {
      id: "asset-template-image-alt-prop",
      instanceId: assetTemplateImageInstanceId,
      name: "alt",
      type: "asset",
      value: assetTemplateImageAssetId,
    },
    {
      id: "asset-template-video-src-prop",
      instanceId: assetTemplateVideoInstanceId,
      name: "src",
      type: "asset",
      value: assetTemplateVideoAssetId,
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
    styleSources: JSON.stringify([
      {
        type: "local",
        id: styledHeadingTemplateLocalStyleSourceId,
      },
    ]),
    styleSourceSelections: JSON.stringify([
      {
        instanceId: styledHeadingTemplateId,
        values: [styledHeadingTemplateLocalStyleSourceId],
      },
    ]),
    styles: JSON.stringify([
      {
        styleSourceId: styledHeadingTemplateLocalStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "fontSize",
        value: {
          type: "unit",
          unit: "px",
          value: Number.parseFloat(styledHeadingTemplateFontSize),
        },
      },
    ]),
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

  await Promise.all([
    insertFile({
      name: assetTemplateImageName,
      format: "svg",
      size: 120,
      status: "UPLOADED",
      meta: JSON.stringify({ width: 120, height: 80 }),
    }),
    insertFile({
      name: assetTemplateVideoName,
      format: "mp4",
      size: 120,
      status: "UPLOADED",
      meta: JSON.stringify({}),
    }),
  ]);
  await Promise.all([
    insertAsset({
      id: assetTemplateImageAssetId,
      projectId,
      name: assetTemplateImageName,
      filename: assetTemplateImageName,
      description: assetTemplateImageAlt,
    }),
    insertAsset({
      id: assetTemplateVideoAssetId,
      projectId,
      name: assetTemplateVideoName,
      filename: assetTemplateVideoName,
      description: "Template asset video",
    }),
  ]);

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
    assetTemplateName,
    assetTemplateImageAlt,
    assetTemplateVideoName,
    styledHeadingTemplateName,
    styledHeadingTemplateText,
    styledHeadingTemplateFontSize,
  };
};
