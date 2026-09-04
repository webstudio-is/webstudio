import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { loadDevBuild, updateBuild } from "../db";

type InstanceData = {
  type: "instance";
  id: string;
  component: string;
  tag?: string;
  name?: string;
  label?: string;
  children: Array<{ type: string; value: string }>;
};

type PropData = {
  id: string;
  instanceId: string;
  name: string;
  type: string;
  value: unknown;
};

type DataSourceData = {
  id: string;
  type: string;
  name: string;
  scopeInstanceId: string;
  value?: unknown;
};

const blockId = "content-block";
const templateId = "content-block-template";

const getBuildData = async (projectId: string) => {
  const build = await loadDevBuild({ projectId });
  return {
    build,
    instances: JSON.parse(build.instances) as InstanceData[],
    props: JSON.parse(build.props) as PropData[],
    dataSources: JSON.parse(build.dataSources) as DataSourceData[],
  };
};

export const configureRepresentableContentBlockBody = async (
  projectId: string
) => {
  const { build, instances } = await getBuildData(projectId);
  const block = instances.find((instance) => instance.id === blockId);
  if (block === undefined) {
    throw new Error("Expected the Content Block fixture instance");
  }
  block.children = [
    { type: "id", value: "list-item" },
    { type: "id", value: templateId },
  ];
  await updateBuild(build.id, { instances: JSON.stringify(instances) });
};

export const configureEmptyHeadingTemplate = async (projectId: string) => {
  const { build, instances } = await getBuildData(projectId);
  const templates = instances.find((instance) => instance.id === templateId);
  if (templates === undefined) {
    throw new Error("Expected the Content Block templates fixture instance");
  }
  const emptyHeadingId = "empty-heading-template";
  templates.children.push({ type: "id", value: emptyHeadingId });
  instances.push({
    type: "instance",
    id: emptyHeadingId,
    component: "ws:element",
    tag: "h1",
    name: "EmptyHeadingTemplate",
    label: "Empty Heading Template",
    children: [],
  });
  await updateBuild(build.id, { instances: JSON.stringify(instances) });
};

export const configureNamedTemplateLifecycle = async (projectId: string) => {
  const { build, instances } = await getBuildData(projectId);
  const templates = instances.find((instance) => instance.id === templateId);
  if (templates === undefined) {
    throw new Error("Expected the Content Block templates fixture instance");
  }
  const lifecycleTemplateId = "lifecycle-card-template";
  templates.children.push({ type: "id", value: lifecycleTemplateId });
  instances.push({
    type: "instance",
    id: lifecycleTemplateId,
    component: "ws:element",
    tag: "section",
    name: "LifecycleCard",
    label: "Lifecycle Card",
    children: [{ type: "text", value: "Default lifecycle card" }],
  });
  await updateBuild(build.id, { instances: JSON.stringify(instances) });
};

const configureSourceBlock = ({
  instances,
  props,
  expression,
}: {
  instances: InstanceData[];
  props: PropData[];
  expression: string;
}) => {
  const block = instances.find((instance) => instance.id === blockId);
  if (block === undefined) {
    throw new Error("Expected the Content Block fixture instance");
  }
  block.children = [{ type: "id", value: templateId }];
  props.push({
    id: "content-block-source",
    instanceId: blockId,
    name: "src",
    type: "expression",
    value: expression,
  });
};

export const configureDynamicDetailContentBlock = async ({
  projectId,
  initialAssetId,
}: {
  projectId: string;
  initialAssetId: string;
}) => {
  const { build, instances, props, dataSources } =
    await getBuildData(projectId);
  configureSourceBlock({
    instances,
    props,
    expression: "$ws$system.params.assetid",
  });
  const pages = JSON.parse(build.pages) as {
    homePageId: string;
    rootFolderId: string;
    pages: Array<{
      id: string;
      name: string;
      title: string;
      path: string;
      history?: string[];
      rootInstanceId: string;
    }>;
    folders: Array<{ id: string; children: string[] }>;
  };
  const homePage = pages.pages.find((page) => page.id === pages.homePageId);
  if (homePage === undefined) {
    throw new Error("Expected the Content Block fixture home page");
  }
  const dynamicPageId = homePage.id;
  const homeRootId = "mdx-detail-home-root";
  const body = instances.find(
    (instance) => instance.id === homePage.rootInstanceId
  );
  if (body === undefined) {
    throw new Error("Expected the Content Block fixture page root");
  }
  instances.push({ ...body, id: homeRootId, children: [] });
  pages.pages.push({
    ...homePage,
    id: "mdx-detail-home-page",
    name: "MDX detail home",
    title: JSON.stringify("MDX detail home"),
    path: "",
    history: [],
    rootInstanceId: homeRootId,
  });
  pages.homePageId = "mdx-detail-home-page";
  const rootFolder = pages.folders.find(
    (folder) => folder.id === pages.rootFolderId
  );
  if (rootFolder === undefined) {
    throw new Error("Expected the Content Block fixture root folder");
  }
  rootFolder.children = [
    pages.homePageId,
    dynamicPageId,
    ...rootFolder.children.filter((id) => id !== dynamicPageId),
  ];
  homePage.name = "Dynamic MDX detail";
  homePage.title = JSON.stringify("Dynamic MDX detail");
  homePage.path = "/:assetid";
  homePage.history = [`/${initialAssetId}`];
  await updateBuild(build.id, {
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
    dataSources: JSON.stringify(dataSources),
    pages: JSON.stringify(pages),
  });
  return dynamicPageId;
};

export const configureRepeatedContentBlock = async ({
  projectId,
  assetIds,
}: {
  projectId: string;
  assetIds: [string, string];
}) => {
  const { build, instances, props, dataSources } =
    await getBuildData(projectId);
  const collectionId = "mdx-content-collection";
  const itemParameterId = "mdx-content-collection-item";
  const itemKeyParameterId = "mdx-content-collection-item-key";
  configureSourceBlock({
    instances,
    props,
    expression: `${encodeDataSourceVariable(itemParameterId)}?.assetId`,
  });
  const body = instances.find((instance) => instance.id === "body");
  if (body === undefined) {
    throw new Error("Expected the Content Block fixture body");
  }
  body.children = [{ type: "id", value: collectionId }];
  instances.push({
    type: "instance",
    id: collectionId,
    component: "ws:collection",
    children: [{ type: "id", value: blockId }],
  });
  props.push(
    {
      id: "mdx-content-collection-data",
      instanceId: collectionId,
      name: "data",
      type: "json",
      value: assetIds.map((assetId) => ({ assetId })),
    },
    {
      id: "mdx-content-collection-item-prop",
      instanceId: collectionId,
      name: "item",
      type: "parameter",
      value: itemParameterId,
    },
    {
      id: "mdx-content-collection-item-key-prop",
      instanceId: collectionId,
      name: "itemKey",
      type: "parameter",
      value: itemKeyParameterId,
    }
  );
  dataSources.push(
    {
      id: itemParameterId,
      type: "parameter",
      name: "collectionItem",
      scopeInstanceId: collectionId,
    },
    {
      id: itemKeyParameterId,
      type: "parameter",
      name: "collectionItemKey",
      scopeInstanceId: collectionId,
    }
  );
  await updateBuild(build.id, {
    instances: JSON.stringify(instances),
    props: JSON.stringify(props),
    dataSources: JSON.stringify(dataSources),
  });
};
