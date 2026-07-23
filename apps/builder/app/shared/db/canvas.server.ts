import {
  bundleVersion,
  type PublishedProjectBundle,
  type ProjectBundle,
} from "@webstudio-is/protocol";
import {
  loadBuildById,
  loadDevBuildByProjectId,
} from "@webstudio-is/project-build/server";
import { collectFontFamiliesFromStyleDecls } from "@webstudio-is/project-build/runtime";
import {
  loadAssetDataByProject,
  loadCanonicalAssetFileSnapshot,
  prepareAssetResourceIndexSnapshotsForPublication,
  getAssetResourceQuery,
  synchronizeCanonicalAssets,
} from "@webstudio-is/asset-uploader/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  findPageByIdOrPath,
  getAllPages,
  getStyleDeclKey,
  assetResourceLimits,
  isStoredAssetQueryResource,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import {
  computeAssetResourceQueryHash,
  computeCanonicalAssetRevision,
  serializeAssetResourceIndex,
} from "@webstudio-is/asset-resource";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { loadById } from "@webstudio-is/project/index.server";
import { getUserById } from "./user.server";
import { createAssetClientWithResourceIndexStore } from "../asset-client";

const getPair = <Item extends { id: string }>(item: Item): [string, Item] => [
  item.id,
  item,
];

type Project = NonNullable<Awaited<ReturnType<typeof loadById>>>;
type Build = Awaited<ReturnType<typeof loadBuildById>>;

class ProjectNotPublishedError extends Error {
  webstudioCode = "PROJECT_NOT_PUBLISHED" as const;
}

const serializeProjectBundle = ({
  build,
  assets,
  assetFolders = [],
}: {
  build: Build;
  assets: Asset[];
  assetFolders?: AssetFolder[];
}): ProjectBundle => {
  const page = findPageByIdOrPath("/", build.pages);

  if (page === undefined) {
    throw new Error(`Page / not found`);
  }

  const fontFamilies = collectFontFamiliesFromStyleDecls(build.styles);

  // Filter unused font assets but include all other asset types (images, videos, audio, documents)
  const usedAssets = assets.filter(
    (asset) =>
      asset.type === "image" ||
      asset.type === "file" ||
      (asset.type === "font" && fontFamilies.has(asset.meta.family))
  );

  return {
    build: {
      id: build.id,
      projectId: build.projectId,
      version: build.version,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      pages: serializePages(build.pages),
      breakpoints: build.breakpoints.map(getPair),
      styles: build.styles.map((item) => [getStyleDeclKey(item), item]),
      styleSources: build.styleSources.map(getPair),
      styleSourceSelections: build.styleSourceSelections.map((item) => [
        item.instanceId,
        item,
      ]),
      props: build.props.map(getPair),
      dataSources: build.dataSources.map(getPair),
      resources: build.resources.map(getPair),
      instances: build.instances.map(getPair),
      marketplaceProduct: build.marketplaceProduct,
      projectSettings: build.projectSettings,
      deployment: build.deployment,
    },
    page,
    pages: getAllPages(build.pages),
    assets: usedAssets,
    assetFolders,
  };
};

const createProjectBundle = async (
  build: Build,
  context: AppContext
): Promise<ProjectBundle> => {
  return serializeProjectBundle({
    build,
    ...(await loadAssetDataByProject(build.projectId, context)),
  });
};

const loadProductionCanvasDataAndProject = async (
  buildId: string,
  context: AppContext,
  project?: Project
): Promise<{ data: ProjectBundle; project: Project }> => {
  const build = await loadBuildById(context, buildId);

  if (build === undefined) {
    throw new ProjectNotPublishedError("The project is not published");
  }

  const { deployment } = build;

  if (deployment === undefined) {
    throw new ProjectNotPublishedError("The project is not published");
  }

  project = project ?? (await loadById(build.projectId, context));
  if (project === null) {
    throw new Error(`Project "${build.projectId}" not found`);
  }

  const currentProjectDomains = project.domainsVirtual;

  // Check that build deployment domains are still active and verified
  // for examle: redeploy created few days later
  if (deployment.destination !== "static") {
    deployment.domains = deployment.domains.filter(
      (domain) =>
        project.domain === domain ||
        currentProjectDomains.some(
          (projectDomain) =>
            projectDomain.domain === domain &&
            projectDomain.status === "ACTIVE" &&
            projectDomain.verified
        )
    );
  }

  return {
    data: await createProjectBundle({ ...build, deployment }, context),
    project,
  };
};

const addProjectMetadata = async (
  data: ProjectBundle,
  project: Project,
  context: AppContext
): Promise<PublishedProjectBundle> => {
  const user =
    project.userId === null
      ? undefined
      : await getUserById(context, project.userId);

  const reachableResourceIds = new Set<string>();
  for (const [, prop] of data.build.props) {
    if (prop.type === "resource") {
      reachableResourceIds.add(prop.value);
    }
  }
  for (const [, dataSource] of data.build.dataSources) {
    if (dataSource.type === "resource") {
      reachableResourceIds.add(dataSource.resourceId);
    }
  }
  const assetQueryResources = data.build.resources
    .map(([, resource]) => resource)
    .flatMap((resource) => {
      if (reachableResourceIds.has(resource.id) === false) {
        return [];
      }
      const query = getAssetResourceQuery(resource);
      if (query !== undefined) {
        return [{ resourceId: resource.id, query }];
      }
      if (isStoredAssetQueryResource(resource)) {
        throw new Error(
          `Assets resource ${JSON.stringify(resource.id)} has an invalid query configuration`
        );
      }
      return [];
    });
  if (assetQueryResources.length > assetResourceLimits.publishedResourceCount) {
    throw new Error("Published Assets resource count exceeds the limit");
  }
  let assetResourceIndexes: PublishedProjectBundle["assetResourceIndexes"];
  let publishedAssets = data.assets;
  let publishedAssetFolders = data.assetFolders;
  if (assetQueryResources.length > 0) {
    const assetClient = createAssetClientWithResourceIndexStore();
    const indexedResources = await Promise.all(
      assetQueryResources.map(async ({ resourceId, query }) => ({
        resourceId,
        query,
        queryHash: await computeAssetResourceQueryHash(query),
      }))
    );
    const currentBuild = await loadDevBuildByProjectId(context, project.id);
    const currentQueries = new Map(
      (currentBuild?.resources ?? []).map((resource) => [
        resource.id,
        getAssetResourceQuery(resource),
      ])
    );
    const currentResourceIds = indexedResources
      .filter(
        ({ resourceId, query }) => currentQueries.get(resourceId) === query
      )
      .map(({ resourceId }) => resourceId);
    const retainedFontIds = new Set(
      data.assets
        .filter((asset) => asset.type === "font")
        .map((asset) => asset.id)
    );
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const assetDataBefore = await loadAssetDataByProject(project.id, context);
      await synchronizeCanonicalAssets({
        client: context.postgrest.client,
        projectId: project.id,
        assetClient,
      });
      const { entries: canonicalEntries, metadataSnapshot } =
        await loadCanonicalAssetFileSnapshot({
          client: context.postgrest.client,
          projectId: project.id,
        });
      const expectedAssetRevision =
        await computeCanonicalAssetRevision(canonicalEntries);
      const preparedIndexes =
        await prepareAssetResourceIndexSnapshotsForPublication({
          client: context.postgrest.client,
          store: assetClient.resourceIndexStore,
          projectId: project.id,
          resources: indexedResources,
          entries: canonicalEntries,
          read: assetClient.resourceIndexStore.read,
          referenceId: data.build.id,
          assetRevision: expectedAssetRevision,
          metadataSnapshot,
          currentResourceIds,
        });
      const [assetDataAfter, latestCanonical] = await Promise.all([
        loadAssetDataByProject(project.id, context),
        loadCanonicalAssetFileSnapshot({
          client: context.postgrest.client,
          projectId: project.id,
        }),
      ]);
      const latestAssetRevision = await computeCanonicalAssetRevision(
        latestCanonical.entries
      );
      const assetsStayedStable =
        JSON.stringify(assetDataBefore) === JSON.stringify(assetDataAfter) &&
        expectedAssetRevision === latestAssetRevision;
      if (assetsStayedStable === false) {
        if (attempt === 0) {
          continue;
        }
        throw new Error("Assets changed while preparing publication; retry");
      }
      assetResourceIndexes = preparedIndexes;
      publishedAssets = assetDataAfter.assets.filter(
        (asset) => asset.type !== "font" || retainedFontIds.has(asset.id)
      );
      publishedAssetFolders = assetDataAfter.assetFolders;
      break;
    }
    if (assetResourceIndexes === undefined) {
      throw new Error("Asset resource indexes were not prepared");
    }
    const totalIndexBytes = assetResourceIndexes.reduce(
      (total, snapshot) =>
        total +
        new TextEncoder().encode(serializeAssetResourceIndex(snapshot.index))
          .byteLength,
      0
    );
    if (totalIndexBytes > assetResourceLimits.publishedIndexBytes) {
      throw new Error(
        "Published Assets resource indexes exceed the byte limit"
      );
    }
  }

  return {
    ...data,
    assets: publishedAssets,
    assetFolders: publishedAssetFolders,
    bundleVersion,
    user: user ? { email: user.email } : undefined,
    projectDomain: project.domain,
    projectTitle: project.title,
    assetResourceIndexes,
  };
};

type LoadPublishedProjectBundleByProjectIdDependencies = {
  addProjectMetadata: typeof addProjectMetadata;
  loadProductionCanvasDataAndProject: typeof loadProductionCanvasDataAndProject;
  loadProjectById: typeof loadById;
};

const createLoadPublishedProjectBundleByProjectId =
  ({
    addProjectMetadata,
    loadProductionCanvasDataAndProject,
    loadProjectById,
  }: LoadPublishedProjectBundleByProjectIdDependencies) =>
  async (
    projectId: string,
    context: AppContext
  ): Promise<PublishedProjectBundle> => {
    const project = await loadProjectById(projectId, context);
    if (project === null) {
      throw new Error(`Project "${projectId}" not found`);
    }

    const buildId = project.latestBuildVirtual?.buildId;
    if (buildId === undefined || buildId === null) {
      throw new ProjectNotPublishedError("The project is not published yet");
    }

    const { data } = await loadProductionCanvasDataAndProject(
      buildId,
      context,
      project
    );
    return await addProjectMetadata(data, project, context);
  };

export const loadProductionCanvasData = async (
  buildId: string,
  context: AppContext
): Promise<ProjectBundle> => {
  const { data } = await loadProductionCanvasDataAndProject(buildId, context);
  return data;
};

export const loadPublishedProjectBundleByBuildId = async (
  buildId: string,
  context: AppContext
): Promise<PublishedProjectBundle> => {
  const { data, project } = await loadProductionCanvasDataAndProject(
    buildId,
    context
  );
  return await addProjectMetadata(data, project, context);
};

export const loadPublishedProjectBundleByProjectId =
  createLoadPublishedProjectBundleByProjectId({
    addProjectMetadata,
    loadProductionCanvasDataAndProject,
    loadProjectById: loadById,
  });

export const loadProjectBundleByBuildId = async (
  buildId: string,
  context: AppContext
): Promise<PublishedProjectBundle> => {
  const build = await loadBuildById(context, buildId);
  const project = await loadById(build.projectId, context);
  if (project === null) {
    throw new Error(`Project "${build.projectId}" not found`);
  }
  return await addProjectMetadata(
    await createProjectBundle(build, context),
    project,
    context
  );
};

export const loadProjectBundleByProjectId = async (
  projectId: string,
  context: AppContext
): Promise<PublishedProjectBundle> => {
  const project = await loadById(projectId, context);
  if (project === null) {
    throw new Error(`Project "${projectId}" not found`);
  }
  return await addProjectMetadata(
    await createProjectBundle(
      await loadDevBuildByProjectId(context, projectId),
      context
    ),
    project,
    context
  );
};

export const __testing__ = {
  createLoadPublishedProjectBundleByProjectId,
  serializeProjectBundle,
};
