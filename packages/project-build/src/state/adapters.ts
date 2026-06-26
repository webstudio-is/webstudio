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
import type { Pages } from "@webstudio-is/sdk";
import type { MarketplaceProduct } from "../shared/marketplace";

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

const setClonedBuilderStateValue = <Namespace extends BuilderNamespace>(
  state: BuilderState,
  namespace: Namespace,
  value: BuilderStateValueByNamespace[Namespace]
) => {
  if (namespace === "pages") {
    state.pages = migratePages(serializePages(value as Pages));
    return;
  }
  if (namespace === "marketplaceProduct") {
    state.marketplaceProduct = structuredClone(value as MarketplaceProduct);
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
  if (namespace === "marketplaceProduct") {
    state.marketplaceProduct = structuredClone(value as MarketplaceProduct);
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

  return state;
};
