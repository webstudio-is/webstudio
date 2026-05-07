import type { Data } from "@webstudio-is/http-client";
import { loadBuildById } from "@webstudio-is/project-build/index.server";
import { loadAssetsByProject } from "@webstudio-is/asset-uploader/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import {
  findPageByIdOrPath,
  getAllPages,
  getStyleDeclKey,
} from "@webstudio-is/sdk";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import * as projectApi from "@webstudio-is/project/index.server";
import { getUserById, type User } from "./user.server";

export type PublishedProjectData = Data & {
  user: { email: User["email"] } | undefined;
  projectDomain: string;
  projectTitle: string;
};

const getPair = <Item extends { id: string }>(item: Item): [string, Item] => [
  item.id,
  item,
];

type Project = NonNullable<Awaited<ReturnType<typeof projectApi.loadById>>>;

const loadProductionCanvasDataAndProject = async (
  buildId: string,
  context: AppContext,
  project?: Project
): Promise<{ data: Data; project: Project }> => {
  const build = await loadBuildById(context, buildId);

  if (build === undefined) {
    throw new Error("The project is not published");
  }

  const { deployment } = build;

  if (deployment === undefined) {
    throw new Error("The project is not published");
  }

  project = project ?? (await projectApi.loadById(build.projectId, context));
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

  const page = findPageByIdOrPath("/", build.pages);

  if (page === undefined) {
    throw new Error(`Page / not found`);
  }

  const allAssets = await loadAssetsByProject(build.projectId, context);

  // Find all fonts referenced in styles
  const fontFamilySet = new Set<string>();
  for (const { value } of build.styles) {
    if (value.type === "fontFamily") {
      for (const fontFamily of value.value) {
        fontFamilySet.add(fontFamily);
      }
    }
  }

  // Filter unused font assets but include all other asset types (images, videos, audio, documents)
  const assets = allAssets.filter(
    (asset) =>
      asset.type === "image" ||
      asset.type === "file" ||
      (asset.type === "font" && fontFamilySet.has(asset.meta.family))
  );

  return {
    data: {
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
        deployment,
      },
      page,
      pages: getAllPages(build.pages),
      assets,
    },
    project,
  };
};

const addProjectMetadata = async (
  data: Data,
  project: Project,
  context: AppContext
): Promise<PublishedProjectData> => {
  const user =
    project.userId === null
      ? undefined
      : await getUserById(context, project.userId);

  return {
    ...data,
    user: user ? { email: user.email } : undefined,
    projectDomain: project.domain,
    projectTitle: project.title,
  };
};

export const loadProductionCanvasData = async (
  buildId: string,
  context: AppContext
): Promise<Data> => {
  const { data } = await loadProductionCanvasDataAndProject(buildId, context);
  return data;
};

export const loadPublishedProjectDataByBuildId = async (
  buildId: string,
  context: AppContext
): Promise<PublishedProjectData> => {
  const { data, project } = await loadProductionCanvasDataAndProject(
    buildId,
    context
  );
  return await addProjectMetadata(data, project, context);
};

export const loadPublishedProjectDataByProjectId = async (
  projectId: string,
  context: AppContext
): Promise<PublishedProjectData> => {
  const project = await projectApi.loadById(projectId, context);
  if (project === null) {
    throw new Error(`Project "${projectId}" not found`);
  }

  const buildId = project.latestBuildVirtual?.buildId;
  if (buildId === undefined || buildId === null) {
    throw new Error("The project is not published yet");
  }

  const { data } = await loadProductionCanvasDataAndProject(
    buildId,
    context,
    project
  );
  return await addProjectMetadata(data, project, context);
};
