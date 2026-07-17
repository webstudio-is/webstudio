import {
  getStyleDeclKey,
  type AssetFolders,
  type WebstudioData,
} from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  type MarketplaceProduct,
  type ProjectSettings,
} from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/services/trcp-router.server";
import { $project, readBuilderStateStores } from "~/shared/sync/data-stores";
import { nativeClient } from "~/shared/trpc/trpc-client";

export type BuilderData = Omit<WebstudioData, "assetFolders"> & {
  assetFolders: AssetFolders;
  marketplaceProduct: undefined | MarketplaceProduct;
  projectSettings: ProjectSettings;
  project: Project;
};

type LoadDataOutput = inferRouterOutputs<AppRouter>["build"]["loadData"];

export type LoadedBuilderData = BuilderData &
  Pick<LoadDataOutput, "id" | "version" | "publisherHost" | "projectId">;

export const getBuilderData = (): BuilderData => {
  const data = readBuilderStateStores();
  const { pages, projectSettings } = data;
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  const project = $project.get();
  if (project === undefined) {
    throw Error(`Cannot get webstudio data with empty project`);
  }
  if (projectSettings === undefined) {
    throw Error(`Cannot get webstudio data with empty project settings`);
  }
  return {
    ...data,
    pages,
    project,
    projectSettings,
  };
};

const getPair = <Item extends { id: string }>(item: Item) =>
  [item.id, item] as const;

const hydrateIdMap = <Item extends { id: string }>(items: Item[]) =>
  new Map(items.map(getPair));

const hydrateMap = <Item, Key>(items: Item[], getKey: (item: Item) => Key) =>
  new Map(items.map((item) => [getKey(item), item] as const));

export const loadBuilderData = async ({
  projectId,
  signal,
}: {
  projectId: string;
  signal: AbortSignal;
}): Promise<LoadedBuilderData> => {
  try {
    const data = await nativeClient.build.loadData.query(
      { projectId },
      { signal }
    );
    const pages = migratePages(data.pages);
    return {
      id: data.id,
      version: data.version,
      projectId: data.projectId,
      project: data.project,
      publisherHost: data.publisherHost,
      assets: hydrateIdMap(data.assets),
      assetFolders: hydrateIdMap(data.assetFolders),
      instances: hydrateIdMap(data.instances),
      dataSources: hydrateIdMap(data.dataSources),
      resources: hydrateIdMap(data.resources),
      props: hydrateIdMap(data.props),
      pages,
      breakpoints: hydrateIdMap(data.breakpoints),
      styleSources: hydrateIdMap(data.styleSources),
      styleSourceSelections: hydrateMap(
        data.styleSourceSelections,
        (item) => item.instanceId
      ),
      styles: hydrateMap(data.styles, (item) => getStyleDeclKey(item)),
      marketplaceProduct: data.marketplaceProduct,
      projectSettings: data.projectSettings,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : JSON.stringify(error);

    if (signal.aborted === false) {
      // No toasts available in this context
      alert(`Unable to load builder data. ${message}`);
    }

    throw new Error(`Unable to load builder data. ${message}`, {
      cause: error,
    });
  }
};
