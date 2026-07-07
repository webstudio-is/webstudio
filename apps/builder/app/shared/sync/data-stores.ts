/**
 * All data stores used by the sync infrastructure.
 * This provides a single source of truth for stores used in sync-server and sync-stores.
 */

import { atom } from "nanostores";
import type {
  Assets,
  Breakpoints,
  DataSources,
  Instances,
  Pages,
  Props,
  Resource,
  Styles,
  StyleSources,
  StyleSourceSelections,
} from "@webstudio-is/sdk";
import type { Project } from "@webstudio-is/project";
import type { MarketplaceProduct } from "@webstudio-is/project-build";

export const $project = atom<Project | undefined>();

export const $pages = atom<undefined | Pages>(undefined);

export const $assets = atom<Assets>(new Map());

export const $instances = atom<Instances>(new Map());

export const $props = atom<Props>(new Map());

export const $dataSources = atom<DataSources>(new Map());

export const $resources = atom(new Map<Resource["id"], Resource>());

export const $breakpoints = atom<Breakpoints>(new Map());

/**
 * styleSources defines where styles come from (local or token).
 *
 * $styles contains actual styling rules, tied to styleSourceIds.
 * $styles.styleSourceId -> $styleSources.id
 */
export const $styleSources = atom<StyleSources>(new Map());

/**
 * This is a list of connections between instances (instanceIds) and styleSources.
 * $styleSourceSelections.values[] -> $styleSources.id[]
 */
export const $styleSourceSelections = atom<StyleSourceSelections>(new Map());

/**
 * $styles contains actual styling rules
 * (breakpointId, styleSourceId, property, value, listed), tied to styleSourceIds
 * $styles.styleSourceId -> $styleSources.id
 */
export const $styles = atom<Styles>(new Map());

export const $marketplaceProduct = atom<undefined | MarketplaceProduct>();

export const $publisherHost = atom<string>("wstd.work");

/**
 * Get initial values for all data stores.
 * Used for resetting stores when switching between projects.
 */
const getInitialDataStoreValues = () => ({
  project: undefined,
  pages: undefined,
  assets: new Map(),
  instances: new Map(),
  props: new Map(),
  dataSources: new Map(),
  resources: new Map(),
  breakpoints: new Map(),
  styleSources: new Map(),
  styleSourceSelections: new Map(),
  styles: new Map(),
  marketplaceProduct: undefined,
  publisherHost: "wstd.work",
});

/**
 * Reset all data stores to their initial values.
 * Call this when switching between projects to prevent data leakage.
 */
export const resetDataStores = () => {
  const initial = getInitialDataStoreValues();
  $project.set(initial.project);
  $pages.set(initial.pages);
  $assets.set(initial.assets);
  $instances.set(initial.instances);
  $props.set(initial.props);
  $dataSources.set(initial.dataSources);
  $resources.set(initial.resources);
  $breakpoints.set(initial.breakpoints);
  $styleSources.set(initial.styleSources);
  $styleSourceSelections.set(initial.styleSourceSelections);
  $styles.set(initial.styles);
  $marketplaceProduct.set(initial.marketplaceProduct);
  $publisherHost.set(initial.publisherHost);
};
