import {
  migratePages,
  serializePages,
} from "@webstudio-is/project-migrations/pages";
import {
  type BuilderState,
  type BuilderStateValueByNamespace,
} from "./builder-state";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "../contracts/namespaces";
import {
  getStyleDeclKey,
  type Asset,
  type Breakpoint,
  type DataSource,
  type Instance,
  type Pages,
  type Prop,
  type Resource,
  type StyleDecl,
  type StyleSource,
  type StyleSourceSelection,
} from "@webstudio-is/sdk";
import type { MarketplaceProduct } from "../shared/marketplace";
import {
  createProjectSettingsFromPages,
  removeLegacyProjectSettingsFromPages,
  type ProjectSettings,
} from "../shared/project-settings";
import type { CompactBuild } from "../types";

type SnapshotValue<Namespace extends BuilderNamespace> =
  BuilderStateValueByNamespace[Namespace] extends Map<infer Key, infer Value>
    ? readonly (readonly [Key, Value])[]
    : BuilderStateValueByNamespace[Namespace];

export type BuilderStateSnapshot = Partial<{
  [Namespace in BuilderNamespace]: SnapshotValue<Namespace>;
}>;

export type SerializedBuilderStateSnapshot = Omit<
  BuilderStateSnapshot,
  "pages"
> & {
  pages?: unknown;
};

export type BuilderBuildDataSnapshot = Partial<{
  pages: Pages;
  instances: Instance[];
  props: Prop[];
  styles: StyleDecl[];
  styleSources: StyleSource[];
  styleSourceSelections: StyleSourceSelection[];
  dataSources: DataSource[];
  resources: Resource[];
  assets: Asset[];
  breakpoints: Breakpoint[];
  marketplaceProduct: MarketplaceProduct;
  projectSettings: ProjectSettings;
}>;

export type BuilderCompactBuildDataSnapshot = Pick<
  CompactBuild,
  | "pages"
  | "breakpoints"
  | "styles"
  | "styleSources"
  | "styleSourceSelections"
  | "props"
  | "dataSources"
  | "resources"
  | "instances"
  | "marketplaceProduct"
> & {
  assets?: Asset[];
  projectSettings?: ProjectSettings;
};

export type BuilderStateStore<Namespace extends BuilderNamespace> = {
  get: () => BuilderStateValueByNamespace[Namespace] | undefined;
};

export type BuilderStateStoreMap = Partial<{
  [Namespace in BuilderNamespace]: BuilderStateStore<Namespace>;
}>;

const cloneMapEntries = <Key, Value>(
  entries: readonly (readonly [Key, Value])[]
) => {
  return new Map(entries.map(([key, value]) => [key, structuredClone(value)]));
};

const cloneMap = <Key, Value>(map: Map<Key, Value>) => {
  return cloneMapEntries(Array.from(map.entries()));
};

const mapEntriesById = <Item extends { id: string }>(items: Item[]) =>
  items.map((item) => [item.id, item] as const);

const normalizeProjectSettings = (state: BuilderState) => {
  if (state.pages === undefined) {
    return;
  }
  state.projectSettings ??= createProjectSettingsFromPages(state.pages);
  removeLegacyProjectSettingsFromPages(state.pages);
};

const setClonedBuilderStateValue = <Namespace extends BuilderNamespace>(
  state: BuilderState,
  namespace: Namespace,
  value: BuilderStateValueByNamespace[Namespace]
) => {
  if (namespace === "pages") {
    state.pages = migratePages(serializePages(value as Pages));
    return;
  }
  if (namespace === "marketplaceProduct" || namespace === "projectSettings") {
    (state as Record<string, unknown>)[namespace] = structuredClone(value);
    return;
  }
  (state as Record<string, unknown>)[namespace] = cloneMap(
    value as Map<unknown, unknown>
  );
};

const setClonedBuilderStateSnapshotValue = <Namespace extends BuilderNamespace>(
  state: BuilderState,
  namespace: Namespace,
  value: SnapshotValue<Namespace>
) => {
  if (namespace === "pages") {
    state.pages = migratePages(serializePages(value as Pages));
    return;
  }
  if (namespace === "marketplaceProduct" || namespace === "projectSettings") {
    (state as Record<string, unknown>)[namespace] = structuredClone(value);
    return;
  }
  (state as Record<string, unknown>)[namespace] = cloneMapEntries(
    value as readonly (readonly [unknown, unknown])[]
  );
};

export const createBuilderStateFromStores = (
  stores: BuilderStateStoreMap,
  namespaces: readonly BuilderNamespace[] = builderNamespaces
): BuilderState => {
  const state: BuilderState = {};

  for (const namespace of namespaces) {
    const value = stores[namespace]?.get();
    if (value !== undefined) {
      setClonedBuilderStateValue(state, namespace, value);
    }
  }

  normalizeProjectSettings(state);

  return state;
};

export const createBuilderStateFromSnapshot = (
  build: BuilderStateSnapshot
): BuilderState => {
  const state: BuilderState = {};

  for (const namespace of builderNamespaces) {
    const value = build[namespace];
    if (value !== undefined) {
      setClonedBuilderStateSnapshotValue(
        state,
        namespace,
        value as SnapshotValue<typeof namespace>
      );
    }
  }

  normalizeProjectSettings(state);

  return state;
};

export const createBuilderStateFromSerializedSnapshot = (
  build: SerializedBuilderStateSnapshot
): BuilderState => {
  const { pages, ...snapshot } = build;
  const state = createBuilderStateFromSnapshot(snapshot);

  if (pages !== undefined) {
    setClonedBuilderStateValue(state, "pages", migratePages(pages));
  }
  normalizeProjectSettings(state);

  return state;
};

export const createBuilderStateFromBuildData = (
  build: BuilderBuildDataSnapshot
): BuilderState => {
  const snapshot: BuilderStateSnapshot = {};

  if (build.pages !== undefined) {
    snapshot.pages = build.pages;
  }
  if (build.instances !== undefined) {
    snapshot.instances = mapEntriesById(build.instances);
  }
  if (build.props !== undefined) {
    snapshot.props = mapEntriesById(build.props);
  }
  if (build.styles !== undefined) {
    snapshot.styles = build.styles.map((styleDecl) => [
      getStyleDeclKey(styleDecl),
      styleDecl,
    ]);
  }
  if (build.styleSources !== undefined) {
    snapshot.styleSources = mapEntriesById(build.styleSources);
  }
  if (build.styleSourceSelections !== undefined) {
    snapshot.styleSourceSelections = build.styleSourceSelections.map(
      (selection) => [selection.instanceId, selection] as const
    );
  }
  if (build.dataSources !== undefined) {
    snapshot.dataSources = mapEntriesById(build.dataSources);
  }
  if (build.resources !== undefined) {
    snapshot.resources = mapEntriesById(build.resources);
  }
  if (build.assets !== undefined) {
    snapshot.assets = mapEntriesById(build.assets);
  }
  if (build.breakpoints !== undefined) {
    snapshot.breakpoints = mapEntriesById(build.breakpoints);
  }
  if (build.marketplaceProduct !== undefined) {
    snapshot.marketplaceProduct = build.marketplaceProduct;
  }
  if (build.projectSettings !== undefined) {
    snapshot.projectSettings = build.projectSettings;
  }

  return createBuilderStateFromSnapshot(snapshot);
};

export const createBuilderStateFromCompactBuild = (
  build: BuilderCompactBuildDataSnapshot
): BuilderState =>
  createBuilderStateFromBuildData({
    pages: build.pages,
    breakpoints: build.breakpoints,
    styles: build.styles,
    styleSources: build.styleSources,
    styleSourceSelections: build.styleSourceSelections,
    props: build.props,
    dataSources: build.dataSources,
    resources: build.resources,
    instances: build.instances,
    assets: build.assets,
    marketplaceProduct: build.marketplaceProduct,
    projectSettings:
      build.projectSettings ?? createProjectSettingsFromPages(build.pages),
  });

export const createBuilderStateSnapshotFromState = (
  state: BuilderState
): BuilderStateSnapshot => {
  const snapshot: BuilderStateSnapshot = {};

  for (const namespace of builderNamespaces) {
    const value = state[namespace];
    if (value === undefined) {
      continue;
    }
    if (
      namespace === "pages" ||
      namespace === "projectSettings" ||
      namespace === "marketplaceProduct"
    ) {
      (snapshot as Record<string, unknown>)[namespace] = structuredClone(value);
      continue;
    }
    (snapshot as Record<string, unknown>)[namespace] = Array.from(
      (value as Map<unknown, unknown>).entries()
    ).map(([key, entry]) => [key, structuredClone(entry)]);
  }

  return snapshot;
};

export const createSerializedBuilderStateSnapshotFromState = (
  state: BuilderState
): SerializedBuilderStateSnapshot => {
  const snapshot = createBuilderStateSnapshotFromState(
    state
  ) as SerializedBuilderStateSnapshot;
  if (state.pages !== undefined) {
    snapshot.pages = serializePages(state.pages);
  }
  return snapshot;
};
