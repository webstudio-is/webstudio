import { getStyleDeclKey, type WebstudioData } from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "~/services/trcp-router.server";
import { $project } from "~/shared/sync/data-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $marketplaceProduct,
  $pages,
  $props,
  $resources,
  $styleSourceSelections,
  $styleSources,
  $styles,
} from "~/shared/sync/data-stores";
import { nativeClient } from "~/shared/trpc/trpc-client";

export type BuilderData = WebstudioData & {
  marketplaceProduct: undefined | MarketplaceProduct;
  project: Project;
};

type LoadDataOutput = inferRouterOutputs<AppRouter>["build"]["loadData"];

export type LoadedBuilderData = BuilderData &
  Pick<LoadDataOutput, "id" | "version" | "publisherHost" | "projectId">;

export const getBuilderData = (): BuilderData => {
  const pages = $pages.get();
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  const project = $project.get();
  if (project === undefined) {
    throw Error(`Cannot get webstudio data with empty project`);
  }
  return {
    pages,
    project,
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    breakpoints: $breakpoints.get(),
    styleSourceSelections: $styleSourceSelections.get(),
    styleSources: $styleSources.get(),
    styles: $styles.get(),
    assets: $assets.get(),
    marketplaceProduct: $marketplaceProduct.get(),
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
    return {
      id: data.id,
      version: data.version,
      projectId: data.projectId,
      project: data.project,
      publisherHost: data.publisherHost,
      assets: hydrateIdMap(data.assets),
      instances: hydrateIdMap(data.instances),
      dataSources: hydrateIdMap(data.dataSources),
      resources: hydrateIdMap(data.resources),
      props: hydrateIdMap(data.props),
      pages: migratePages(data.pages),
      breakpoints: hydrateIdMap(data.breakpoints),
      styleSources: hydrateIdMap(data.styleSources),
      styleSourceSelections: hydrateMap(
        data.styleSourceSelections,
        (item) => item.instanceId
      ),
      styles: hydrateMap(data.styles, (item) => getStyleDeclKey(item)),
      marketplaceProduct: data.marketplaceProduct,
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
