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
  builderToken: string;
  initialVersion: number;
  listItemInstanceId: string;
  linkInstanceId: string;
  imageInstanceId: string;
  videoInstanceId: string;
  assetTemplateImageName: string;
  assetTemplateName: string;
  assetTemplateImageAlt: string;
  assetTemplateVideoName: string;
  imageReplacementTemplateName: string;
  imageReplacementTemplateImageAlt: string;
  contentPropsTemplateName: string;
  contentPropsTemplateLinkText: string;
  contentPropsTemplateImageAlt: string;
  contentPropsTemplateVideoName: string;
  editableTextTemplateName: string;
  editableTextTemplateText: string;
  shareLinkEditableText: string;
  collaborationTemplateName: string;
  collaborationTemplateText: string;
  styledHeadingTemplateName: string;
  styledHeadingTemplateText: string;
  styledHeadingTemplateFontSize: string;
  isolatedLocalTemplateName: string;
  isolatedLocalTemplateText: string;
  isolatedLocalTemplateFontSize: string;
  tokenTemplateName: string;
  tokenTemplateText: string;
  tokenTemplateFontSize: string;
  deletableTemplateName: string;
  deletableTemplateText: string;
  nestedTemplateName: string;
  nestedTemplateText: string;
  pageTemplateName: string;
  pageTemplateText: string;
  pageTemplateFontSize: string;
};

const assetTemplateName = "Asset Template";
const assetTemplateImageAlt = "Template asset image";
const assetTemplateImageName = "template-image.svg";
const assetTemplateVideoName = "template-video.mp4";
const assetTemplateImageAssetId = "asset-template-image-asset";
const assetTemplateVideoAssetId = "asset-template-video-asset";
const imageReplacementTemplateName = "Image Replacement Template";
const imageReplacementTemplateImageAlt = "Image replacement template image";
const contentPropsTemplateName = "Content Props Template";
const contentPropsTemplateLinkText = "Content props template link";
const contentPropsTemplateImageAlt = "Content props template image";
const contentPropsTemplateVideoName = "content-props-template-video.mp4";
const editableTextTemplateName = "Editable Text Template";
const editableTextTemplateText = "Editable template content";
const shareLinkEditableText = "Share link editable content";
const collaborationTemplateName = "Collaboration Template";
const collaborationTemplateText = "Collaboration template content";
const styledHeadingTemplateName = "Styled Heading Template";
const styledHeadingTemplateText = "Styled template heading";
const styledHeadingTemplateFontSize = "32px";
const isolatedLocalTemplateName = "Isolated Local Style Template";
const isolatedLocalTemplateText = "Isolated local heading";
const isolatedLocalTemplateFontSize = "34px";
const tokenTemplateName = "Token Template";
const tokenTemplateText = "Token styled heading";
const tokenTemplateFontSize = "36px";
const deletableTemplateName = "Deletable Template";
const deletableTemplateText = "Content block child to delete";
const nestedTemplateName = "Nested Template";
const nestedTemplateText = "Nested content descendant";
const pageTemplateName = "Content Page Template";
const pageTemplateText = "Content page template heading";
const pageTemplateFontSize = "38px";

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
  seededAssetTemplateImageAssetId,
  seededAssetTemplateVideoAssetId,
  pages,
  breakpoints = JSON.stringify([]),
}: {
  listItemInstanceId: string;
  linkInstanceId: string;
  imageInstanceId: string;
  videoInstanceId: string;
  seededAssetTemplateImageAssetId: string;
  seededAssetTemplateVideoAssetId: string;
  pages: string;
  breakpoints?: string;
}) => {
  const rootInstanceId = "body";
  const contentBlockId = "content-block";
  const contentBlockTemplateId = "content-block-template";
  const assetTemplateId = "asset-template";
  const assetTemplateImageInstanceId = "asset-template-image";
  const assetTemplateVideoInstanceId = "asset-template-video";
  const imageReplacementTemplateId = "image-replacement-template";
  const imageReplacementTemplateImageInstanceId =
    "image-replacement-template-image";
  const contentPropsTemplateId = "content-props-template";
  const contentPropsTemplateLinkInstanceId = "content-props-template-link";
  const contentPropsTemplateImageInstanceId = "content-props-template-image";
  const contentPropsTemplateVideoInstanceId = "content-props-template-video";
  const editableTextTemplateId = "editable-text-template";
  const shareLinkEditableInstanceId = "share-link-editable-content";
  const collaborationTemplateId = "collaboration-template";
  const styledHeadingTemplateId = "styled-heading-template";
  const styledHeadingTemplateLocalStyleSourceId =
    "styled-heading-template-local-style-source";
  const isolatedLocalTemplateId = "isolated-local-template";
  const isolatedLocalTemplateStyleSourceId =
    "isolated-local-template-style-source";
  const tokenTemplateId = "token-template";
  const tokenTemplateStyleSourceId = "content-mode-token-style-source";
  const deletableTemplateId = "deletable-template";
  const nestedTemplateId = "nested-template";
  const nestedTemplateTextId = "nested-template-text";
  const pageTemplateId = "content-page-template";
  const pageTemplateRootId = "content-page-template-root";
  const pageTemplateHeadingId = "content-page-template-heading";
  const pageTemplateLocalStyleSourceId =
    "content-page-template-local-style-source";
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
        { type: "id", value: shareLinkEditableInstanceId },
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
        { type: "id", value: isolatedLocalTemplateId },
        { type: "id", value: tokenTemplateId },
        { type: "id", value: imageReplacementTemplateId },
        { type: "id", value: contentPropsTemplateId },
        { type: "id", value: editableTextTemplateId },
        { type: "id", value: collaborationTemplateId },
        { type: "id", value: deletableTemplateId },
        { type: "id", value: nestedTemplateId },
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
      id: imageReplacementTemplateId,
      component: "ws:element",
      tag: "section",
      label: imageReplacementTemplateName,
      children: [
        { type: "id", value: imageReplacementTemplateImageInstanceId },
      ],
    },
    {
      type: "instance",
      id: contentPropsTemplateId,
      component: "ws:element",
      tag: "section",
      label: contentPropsTemplateName,
      children: [
        { type: "id", value: contentPropsTemplateLinkInstanceId },
        { type: "id", value: contentPropsTemplateImageInstanceId },
        { type: "id", value: contentPropsTemplateVideoInstanceId },
      ],
    },
    {
      type: "instance",
      id: editableTextTemplateId,
      component: "ws:element",
      tag: "p",
      label: editableTextTemplateName,
      children: [{ type: "text", value: editableTextTemplateText }],
    },
    {
      type: "instance",
      id: shareLinkEditableInstanceId,
      component: "ws:element",
      tag: "p",
      label: "Share Link Editable Content",
      children: [{ type: "text", value: shareLinkEditableText }],
    },
    {
      type: "instance",
      id: collaborationTemplateId,
      component: "ws:element",
      tag: "p",
      label: collaborationTemplateName,
      children: [{ type: "text", value: collaborationTemplateText }],
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
      id: imageReplacementTemplateImageInstanceId,
      component: "Image",
      label: "Image Replacement Template Image",
      children: [],
    },
    {
      type: "instance",
      id: contentPropsTemplateLinkInstanceId,
      component: "Link",
      label: "Content Props Template Link",
      children: [{ type: "text", value: contentPropsTemplateLinkText }],
    },
    {
      type: "instance",
      id: contentPropsTemplateImageInstanceId,
      component: "Image",
      label: "Content Props Template Image",
      children: [],
    },
    {
      type: "instance",
      id: contentPropsTemplateVideoInstanceId,
      component: "Video",
      label: "Content Props Template Video",
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
    {
      type: "instance",
      id: isolatedLocalTemplateId,
      component: "ws:element",
      tag: "h2",
      label: isolatedLocalTemplateName,
      children: [{ type: "text", value: isolatedLocalTemplateText }],
    },
    {
      type: "instance",
      id: tokenTemplateId,
      component: "ws:element",
      tag: "h2",
      label: tokenTemplateName,
      children: [{ type: "text", value: tokenTemplateText }],
    },
    {
      type: "instance",
      id: deletableTemplateId,
      component: "ws:element",
      tag: "p",
      label: deletableTemplateName,
      children: [{ type: "text", value: deletableTemplateText }],
    },
    {
      type: "instance",
      id: nestedTemplateId,
      component: "ws:element",
      tag: "section",
      label: nestedTemplateName,
      children: [{ type: "id", value: nestedTemplateTextId }],
    },
    {
      type: "instance",
      id: nestedTemplateTextId,
      component: "ws:element",
      tag: "p",
      label: "Nested Text",
      children: [{ type: "text", value: nestedTemplateText }],
    },
    {
      type: "instance",
      id: pageTemplateRootId,
      component: "ws:element",
      tag: "body",
      children: [{ type: "id", value: pageTemplateHeadingId }],
    },
    {
      type: "instance",
      id: pageTemplateHeadingId,
      component: "ws:element",
      tag: "h1",
      label: "Page Template Heading",
      children: [{ type: "text", value: pageTemplateText }],
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
      value: seededAssetTemplateImageAssetId,
    },
    {
      id: "asset-template-image-width-prop",
      instanceId: assetTemplateImageInstanceId,
      name: "width",
      type: "asset",
      value: seededAssetTemplateImageAssetId,
    },
    {
      id: "asset-template-image-height-prop",
      instanceId: assetTemplateImageInstanceId,
      name: "height",
      type: "asset",
      value: seededAssetTemplateImageAssetId,
    },
    {
      id: "asset-template-image-alt-prop",
      instanceId: assetTemplateImageInstanceId,
      name: "alt",
      type: "asset",
      value: seededAssetTemplateImageAssetId,
    },
    {
      id: "asset-template-video-src-prop",
      instanceId: assetTemplateVideoInstanceId,
      name: "src",
      type: "asset",
      value: seededAssetTemplateVideoAssetId,
    },
    {
      id: "image-replacement-template-image-src-prop",
      instanceId: imageReplacementTemplateImageInstanceId,
      name: "src",
      type: "string",
      value:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23ffe5d0'/%3E%3C/svg%3E",
    },
    {
      id: "image-replacement-template-image-width-prop",
      instanceId: imageReplacementTemplateImageInstanceId,
      name: "width",
      type: "number",
      value: 120,
    },
    {
      id: "image-replacement-template-image-height-prop",
      instanceId: imageReplacementTemplateImageInstanceId,
      name: "height",
      type: "number",
      value: 80,
    },
    {
      id: "image-replacement-template-image-alt-prop",
      instanceId: imageReplacementTemplateImageInstanceId,
      name: "alt",
      type: "string",
      value: imageReplacementTemplateImageAlt,
    },
    {
      id: "content-props-template-link-href-prop",
      instanceId: contentPropsTemplateLinkInstanceId,
      name: "href",
      type: "string",
      value: "/content-props-template-link",
    },
    {
      id: "content-props-template-image-src-prop",
      instanceId: contentPropsTemplateImageInstanceId,
      name: "src",
      type: "string",
      value:
        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23f3e8ff'/%3E%3C/svg%3E",
    },
    {
      id: "content-props-template-image-width-prop",
      instanceId: contentPropsTemplateImageInstanceId,
      name: "width",
      type: "number",
      value: 120,
    },
    {
      id: "content-props-template-image-height-prop",
      instanceId: contentPropsTemplateImageInstanceId,
      name: "height",
      type: "number",
      value: 80,
    },
    {
      id: "content-props-template-image-alt-prop",
      instanceId: contentPropsTemplateImageInstanceId,
      name: "alt",
      type: "string",
      value: contentPropsTemplateImageAlt,
    },
    {
      id: "content-props-template-video-src-prop",
      instanceId: contentPropsTemplateVideoInstanceId,
      name: "src",
      type: "string",
      value: `https://example.com/${contentPropsTemplateVideoName}`,
    },
    {
      id: "content-props-template-video-width-prop",
      instanceId: contentPropsTemplateVideoInstanceId,
      name: "width",
      type: "number",
      value: 120,
    },
    {
      id: "content-props-template-video-height-prop",
      instanceId: contentPropsTemplateVideoInstanceId,
      name: "height",
      type: "number",
      value: 80,
    },
  ];

  const nextPages = JSON.parse(pages) as {
    homePageId: string;
    pages: Array<{ id: string; rootInstanceId: string }>;
    pageTemplates?: Array<{
      id: string;
      name: string;
      title: string;
      rootInstanceId: string;
      meta: Record<string, unknown>;
    }>;
  };
  const homePage = nextPages.pages.find(
    (page) => page.id === nextPages.homePageId
  );
  if (homePage === undefined) {
    throw new Error("Expected existing build to have a home page");
  }
  homePage.rootInstanceId = rootInstanceId;
  nextPages.pageTemplates = [
    ...(nextPages.pageTemplates ?? []),
    {
      id: pageTemplateId,
      name: pageTemplateName,
      title: JSON.stringify(pageTemplateName),
      rootInstanceId: pageTemplateRootId,
      meta: {
        description: JSON.stringify("Page template description"),
        excludePageFromSearch: "false",
        language: JSON.stringify("en"),
        custom: [{ property: "template", content: JSON.stringify("content") }],
      },
    },
  ];

  return {
    pages: JSON.stringify(nextPages),
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
    styleSources: JSON.stringify([
      {
        type: "local",
        id: styledHeadingTemplateLocalStyleSourceId,
      },
      {
        type: "local",
        id: isolatedLocalTemplateStyleSourceId,
      },
      {
        type: "token",
        id: tokenTemplateStyleSourceId,
        name: "Content Mode Token",
      },
      {
        type: "local",
        id: pageTemplateLocalStyleSourceId,
      },
    ]),
    styleSourceSelections: JSON.stringify([
      {
        instanceId: styledHeadingTemplateId,
        values: [styledHeadingTemplateLocalStyleSourceId],
      },
      {
        instanceId: isolatedLocalTemplateId,
        values: [isolatedLocalTemplateStyleSourceId],
      },
      {
        instanceId: tokenTemplateId,
        values: [tokenTemplateStyleSourceId],
      },
      {
        instanceId: pageTemplateHeadingId,
        values: [pageTemplateLocalStyleSourceId],
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
      {
        styleSourceId: isolatedLocalTemplateStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "fontSize",
        value: {
          type: "unit",
          unit: "px",
          value: Number.parseFloat(isolatedLocalTemplateFontSize),
        },
      },
      {
        styleSourceId: tokenTemplateStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "fontSize",
        value: {
          type: "unit",
          unit: "px",
          value: Number.parseFloat(tokenTemplateFontSize),
        },
      },
      {
        styleSourceId: pageTemplateLocalStyleSourceId,
        breakpointId: baseBreakpointId,
        property: "fontSize",
        value: {
          type: "unit",
          unit: "px",
          value: Number.parseFloat(pageTemplateFontSize),
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
  builderToken = "e2e-builder-token",
  listItemInstanceId = "list-item",
  linkInstanceId = "content-link",
  imageInstanceId = "content-image",
  videoInstanceId = "content-video",
  assetNamePrefix = "",
}: {
  projectId: string;
  editorToken?: string;
  builderToken?: string;
  listItemInstanceId?: string;
  linkInstanceId?: string;
  imageInstanceId?: string;
  videoInstanceId?: string;
  assetNamePrefix?: string;
}): Promise<SeededContentModeProject> => {
  const build = await loadDevBuild({ projectId });
  const seededAssetTemplateImageName = `${assetNamePrefix}${assetTemplateImageName}`;
  const seededAssetTemplateVideoName = `${assetNamePrefix}${assetTemplateVideoName}`;
  const seededAssetTemplateImageAssetId = `${assetNamePrefix}${assetTemplateImageAssetId}`;
  const seededAssetTemplateVideoAssetId = `${assetNamePrefix}${assetTemplateVideoAssetId}`;

  await Promise.all([
    insertFile({
      name: seededAssetTemplateImageName,
      format: "svg",
      size: 120,
      status: "UPLOADED",
      meta: JSON.stringify({ width: 120, height: 80 }),
    }),
    insertFile({
      name: seededAssetTemplateVideoName,
      format: "mp4",
      size: 120,
      status: "UPLOADED",
      meta: JSON.stringify({}),
    }),
  ]);
  await Promise.all([
    insertAsset({
      id: seededAssetTemplateImageAssetId,
      projectId,
      name: seededAssetTemplateImageName,
      filename: seededAssetTemplateImageName,
      description: assetTemplateImageAlt,
    }),
    insertAsset({
      id: seededAssetTemplateVideoAssetId,
      projectId,
      name: seededAssetTemplateVideoName,
      filename: seededAssetTemplateVideoName,
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
      seededAssetTemplateImageAssetId,
      seededAssetTemplateVideoAssetId,
      pages: build.pages,
      breakpoints: build.breakpoints,
    }),
  });

  await Promise.all([
    insertAuthorizationToken({
      token: editorToken,
      projectId,
      name: "E2E editor token",
      relation: "editors",
    }),
    insertAuthorizationToken({
      token: builderToken,
      projectId,
      name: "E2E builder token",
      relation: "builders",
    }),
  ]);

  return {
    projectId,
    buildId: build.id,
    editorToken,
    builderToken,
    initialVersion: 0,
    listItemInstanceId,
    linkInstanceId,
    imageInstanceId,
    videoInstanceId,
    assetTemplateImageName: seededAssetTemplateImageName,
    assetTemplateName,
    assetTemplateImageAlt,
    assetTemplateVideoName: seededAssetTemplateVideoName,
    imageReplacementTemplateName,
    imageReplacementTemplateImageAlt,
    contentPropsTemplateName,
    contentPropsTemplateLinkText,
    contentPropsTemplateImageAlt,
    contentPropsTemplateVideoName,
    editableTextTemplateName,
    editableTextTemplateText,
    shareLinkEditableText,
    collaborationTemplateName,
    collaborationTemplateText,
    styledHeadingTemplateName,
    styledHeadingTemplateText,
    styledHeadingTemplateFontSize,
    isolatedLocalTemplateName,
    isolatedLocalTemplateText,
    isolatedLocalTemplateFontSize,
    tokenTemplateName,
    tokenTemplateText,
    tokenTemplateFontSize,
    deletableTemplateName,
    deletableTemplateText,
    nestedTemplateName,
    nestedTemplateText,
    pageTemplateName,
    pageTemplateText,
    pageTemplateFontSize,
  };
};
