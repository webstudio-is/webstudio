import type { Asset, WebstudioData } from "@webstudio-is/sdk";
import type { Build, MarketplaceProduct } from "@webstudio-is/project-build";
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
} from "./nano-states";

type BuilderData = WebstudioData & {
  marketplaceProduct: undefined | MarketplaceProduct;
};

export const getBuilderData = (): BuilderData => {
  const pages = $pages.get();
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  return {
    pages,
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

export const setBuilderData = (data: BuilderData) => {
  $assets.set(data.assets);
  $instances.set(data.instances);
  $dataSources.set(data.dataSources);
  $resources.set(data.resources);
  // props should be after data sources to compute logic
  $props.set(data.props);
  $pages.set(data.pages);
  $styleSources.set(data.styleSources);
  $styleSourceSelections.set(data.styleSourceSelections);
  $breakpoints.set(data.breakpoints);
  $styles.set(data.styles);
  $marketplaceProduct.set(data.marketplaceProduct);
};

export const loadBuilderData = async ({
  projectId,
  signal,
}: {
  projectId: string;
  signal: AbortSignal;
}) => {
  const response = await fetch(`/rest/data/${projectId}`, { signal });
  if (response.ok) {
    const data = (await response.json()) as {
      assets: Asset[];
      build: Build;
      marketplaceProduct: undefined | MarketplaceProduct;
    };
    const { assets, build } = data;
    return {
      version: build.version,
      assets: new Map(assets.map((asset) => [asset.id, asset])),
      instances: new Map(build.instances),
      dataSources: new Map(build.dataSources),
      resources: new Map(build.resources),
      props: new Map(build.props),
      pages: build.pages,
      styleSources: new Map(build.styleSources),
      styleSourceSelections: new Map(build.styleSourceSelections),
      breakpoints: new Map(build.breakpoints),
      styles: new Map(build.styles),
      marketplaceProduct: build.marketplaceProduct,
    } satisfies BuilderData & { version: number };
  }
  throw Error("Unable to load builder data");
};
