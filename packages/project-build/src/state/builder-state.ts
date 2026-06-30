import type {
  Assets,
  Breakpoints,
  DataSources,
  Instances,
  Pages,
  Props,
  Resources,
  Styles,
  StyleSources,
  StyleSourceSelections,
} from "@webstudio-is/sdk";
import {
  builderNamespaces,
  type BuilderNamespace,
} from "../contracts/namespaces";
import type { MarketplaceProduct } from "../shared/marketplace";

export type BuilderStateValueByNamespace = {
  pages: Pages;
  instances: Instances;
  props: Props;
  styles: Styles;
  styleSources: StyleSources;
  styleSourceSelections: StyleSourceSelections;
  dataSources: DataSources;
  resources: Resources;
  assets: Assets;
  breakpoints: Breakpoints;
  marketplaceProduct: MarketplaceProduct;
};

export type BuilderState = Partial<BuilderStateValueByNamespace>;

export const getLoadedBuilderStateNamespaces = (
  state: BuilderState
): BuilderNamespace[] => {
  return builderNamespaces.filter(
    (namespace) => state[namespace] !== undefined
  );
};

export const getMissingBuilderStateNamespaces = (
  state: BuilderState,
  requiredNamespaces: readonly BuilderNamespace[] = builderNamespaces
): BuilderNamespace[] => {
  return requiredNamespaces.filter(
    (namespace) => state[namespace] === undefined
  );
};

export const hasBuilderStateNamespaces = (
  state: BuilderState,
  requiredNamespaces: readonly BuilderNamespace[]
) => {
  return (
    getMissingBuilderStateNamespaces(state, requiredNamespaces).length === 0
  );
};
