import { getStyleDeclKey, type WebstudioData } from "@webstudio-is/sdk";
import type { MarketplaceProduct } from "@webstudio-is/project-build";
import type { Project } from "@webstudio-is/project";
import type { loader } from "~/routes/rest.data.$projectId";
import {
  $project,
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
} from "./nano-states";
import { fetch } from "~/shared/fetch.client";

export type BuilderData = WebstudioData & {
  marketplaceProduct: undefined | MarketplaceProduct;
  project: Project;
};

export type LoadedBuilderData = BuilderData &
  Pick<
    Awaited<ReturnType<typeof loader>>,
    "id" | "version" | "publisherHost" | "projectId"
  >;

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

export const loadBuilderData = async ({
  projectId,
  signal,
}: {
  projectId: string;
  signal: AbortSignal;
}): Promise<LoadedBuilderData> => {
  const currentUrl = new URL(location.href);
  const url = new URL(`/rest/data/${projectId}`, currentUrl.origin);
  const headers = new Headers();

  const response = await fetch(url, { headers, signal });

  if (response.ok) {
    const data = (await response.json()) as Awaited<ReturnType<typeof loader>>;
    return {
      id: data.id,
      version: data.version,
      projectId: data.projectId,
      project: data.project,
      publisherHost: data.publisherHost,
      assets: new Map(data.assets.map(getPair)),
      instances: new Map(data.instances.map(getPair)),
      dataSources: new Map(data.dataSources.map(getPair)),
      resources: new Map(data.resources.map(getPair)),
      props: new Map(data.props.map(getPair)),
      pages: data.pages,
      breakpoints: new Map(data.breakpoints.map(getPair)),
      styleSources: new Map(data.styleSources.map(getPair)),
      styleSourceSelections: new Map(
        data.styleSourceSelections.map((item) => [item.instanceId, item])
      ),
      styles: new Map(data.styles.map((item) => [getStyleDeclKey(item), item])),
      marketplaceProduct: data.marketplaceProduct,
    };
  }

  const text = await response.text();

  // No toasts available in this context
  alert(
    `Unable to load builder data. Response status: ${response.status}. Response text: ${text}`
  );

  throw Error(
    `Unable to load builder data. Response status: ${response.status}. Response text: ${text}`
  );
};
