import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { BrowserContext } from "@playwright/test";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { getAssetUploadApiUrl } from "@webstudio-is/sdk/runtime";
import { insertAuthorizationToken, loadDevBuild, updateBuild } from "../db";
import { builderUrl } from "../test";

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
export const lifecycleTemplateId = "lifecycle-card-template";

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

export const configureNamedTemplateLifecycle = async (projectId: string) => {
  const { build, instances } = await getBuildData(projectId);
  const templates = instances.find((instance) => instance.id === templateId);
  if (templates === undefined) {
    throw new Error("Expected the Content Block templates fixture instance");
  }
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

export const mdxEditorPageNames = {
  detail: "Dynamic MDX detail",
  repeated: "Repeated MDX content",
};

export const prepareMdxEditorPages = async ({
  context,
  projectId,
  sourceFilename,
  alternateFilename,
  emptyFilename,
}: {
  context: BrowserContext;
  projectId: string;
  sourceFilename: string;
  alternateFilename: string;
  emptyFilename: string;
}) => {
  const token = randomUUID();
  await insertAuthorizationToken({
    token,
    projectId,
    name: "MDX fixture setup",
    relation: "builders",
    canUseApi: true,
  });
  const upload = async (filename: string, uploadedFilename = filename) => {
    const url = new URL(getAssetUploadApiUrl(uploadedFilename), builderUrl);
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("type", "file");
    url.searchParams.set("format", "mdx");
    if (uploadedFilename !== filename) {
      url.searchParams.set("force", "true");
    }
    const response = await context.request.post(url.href, {
      headers: {
        "x-auth-token": token,
        "content-type": "application/octet-stream",
      },
      data: await readFile(new URL(`./assets/${filename}`, import.meta.url)),
    });
    if (response.ok() === false) {
      throw new Error(
        `MDX fixture upload failed for ${filename}: ${response.status()}`
      );
    }
    const { uploadedAssets } = (await response.json()) as {
      uploadedAssets: Array<{ id: string }>;
    };
    const [asset] = uploadedAssets;
    if (asset === undefined) {
      throw new Error(`Expected an asset ID for ${filename}`);
    }
    return asset.id;
  };
  const [
    { build, instances, props, dataSources },
    sourceAssetId,
    alternateAssetId,
    emptyAssetId,
    detailSourceAssetId,
    detailAlternateAssetId,
  ] = await Promise.all([
    getBuildData(projectId),
    upload(sourceFilename),
    upload(alternateFilename),
    upload(emptyFilename),
    upload(sourceFilename, `detail-${sourceFilename}`),
    upload(alternateFilename, `detail-${alternateFilename}`),
  ]);

  const homeBlock = instances.find((instance) => instance.id === blockId);
  const homeTemplates = instances.find(
    (instance) => instance.id === templateId
  );
  if (homeBlock === undefined || homeTemplates === undefined) {
    throw new Error("Expected the Content Block fixture instances");
  }
  const emptyHeadingId = "empty-heading-template";
  homeTemplates.children.push({ type: "id", value: emptyHeadingId });
  instances.push({
    type: "instance",
    id: emptyHeadingId,
    component: "ws:element",
    tag: "h1",
    name: "EmptyHeadingTemplate",
    label: "Empty Heading Template",
    children: [],
  });
  homeBlock.children = [{ type: "id", value: templateId }];
  props.push({
    id: "content-block-source",
    instanceId: blockId,
    name: "src",
    type: "asset",
    value: emptyAssetId,
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
  const home = pages.pages.find((page) => page.id === pages.homePageId);
  const rootFolder = pages.folders.find(
    (folder) => folder.id === pages.rootFolderId
  );
  if (home === undefined || rootFolder === undefined) {
    throw new Error(
      "Expected the Content Block fixture home page and root folder"
    );
  }

  const addSourcePage = ({
    id,
    name,
    path,
    history,
    expression,
    collectionId,
  }: {
    id: string;
    name: string;
    path: string;
    history?: string[];
    expression: string;
    collectionId?: string;
  }) => {
    const rootInstanceId = `${id}-root`;
    const blockInstanceId = `${id}-block`;
    const blockTemplateId = `${id}-templates`;
    pages.pages.push({
      ...home,
      id,
      name,
      title: JSON.stringify(name),
      path,
      history,
      rootInstanceId,
    });
    rootFolder.children.push(id);
    instances.push(
      {
        type: "instance",
        id: rootInstanceId,
        component: "ws:element",
        tag: "body",
        children: [{ type: "id", value: collectionId ?? blockInstanceId }],
      },
      {
        type: "instance",
        id: blockInstanceId,
        component: "ws:block",
        children: [{ type: "id", value: blockTemplateId }],
      },
      {
        type: "instance",
        id: blockTemplateId,
        component: "ws:block-template",
        children: [],
      }
    );
    props.push({
      id: `${id}-source`,
      instanceId: blockInstanceId,
      name: "src",
      type: "expression",
      value: expression,
    });
    return blockInstanceId;
  };

  addSourcePage({
    id: "mdx-detail-page",
    name: mdxEditorPageNames.detail,
    path: "/:assetid",
    history: [`/${detailSourceAssetId}`],
    expression: "$ws$system.params.assetid",
  });

  const collectionId = "mdx-content-collection";
  const itemParameterId = "mdx-content-collection-item";
  const itemKeyParameterId = "mdx-content-collection-item-key";
  const repeatedPageId = "mdx-repeated-page";
  const repeatedBlockId = addSourcePage({
    id: repeatedPageId,
    name: mdxEditorPageNames.repeated,
    path: "/repeated",
    expression: `${encodeDataSourceVariable(itemParameterId)}.assetId`,
    collectionId,
  });
  instances.push({
    type: "instance",
    id: collectionId,
    component: "ws:collection",
    children: [{ type: "id", value: repeatedBlockId }],
  });
  props.push(
    {
      id: "mdx-content-collection-data",
      instanceId: collectionId,
      name: "data",
      type: "json",
      value: [sourceAssetId, alternateAssetId].map((assetId) => ({ assetId })),
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
    pages: JSON.stringify(pages),
  });
  return {
    homePageName: home.name,
    repeatedPageId,
    detailSourceAssetId,
    detailAlternateAssetId,
  };
};
