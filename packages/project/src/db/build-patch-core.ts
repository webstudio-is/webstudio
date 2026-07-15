import type { Patch } from "immer";
import {
  type Breakpoints,
  breakpoints,
  type Breakpoint,
  type DataSources,
  dataSources,
  type DataSource,
  type Instances,
  instances,
  type Instance,
  type Pages,
  pages,
  type Props,
  props,
  type Prop,
  type Resources,
  resources,
  type Resource,
  type StyleSourceSelections,
  styleSourceSelections,
  type StyleSources,
  styleSources,
  type StyleSource,
  type Styles,
  styles,
  getHomePage,
} from "@webstudio-is/sdk";
import {
  type MarketplaceProduct,
  type ProjectSettings,
  marketplaceProduct,
} from "@webstudio-is/project-build";
import { findCycles } from "@webstudio-is/project-build/runtime";
import {
  parsePages,
  serializePages,
  parseStyleSourceSelections,
  serializeStyleSourceSelections,
  parseStyles,
  serializeStyles,
  parseData,
  parseConfig,
  parseInstanceData,
  serializeConfig,
  serializeData,
} from "@webstudio-is/project-build/persistence";
import type {
  BuilderPatch,
  BuilderPatchTransaction,
} from "@webstudio-is/project-build/contracts";
import { applyBuilderNamespacePatches } from "@webstudio-is/project-build/state";
import type { Database } from "@webstudio-is/postgrest/index.server";

type TouchedKeys = {
  keys: Set<string>;
  wholeMap: boolean;
};

const createTouchedKeys = (): TouchedKeys => ({
  keys: new Set(),
  wholeMap: false,
});

const addTouchedPatchKeys = (touched: TouchedKeys, patches: Patch[]) => {
  for (const patch of patches) {
    const key = patch.path[0];
    if (key === undefined) {
      touched.wholeMap = true;
      continue;
    }
    touched.keys.add(`${key}`);
  }
};

const applyBuildNamespacePatches = <State>(
  namespace: string,
  state: State,
  patches: Parameters<typeof applyBuilderNamespacePatches>[1]
) => {
  try {
    return applyBuilderNamespacePatches(state, patches);
  } catch (error) {
    throw new Error(
      `Cannot apply "${namespace}" patches: ${
        error instanceof Error ? error.message : String(error)
      }. Patches: ${JSON.stringify(patches)}`,
      { cause: error }
    );
  }
};

const getTouchedMap = <Value>(
  map: Map<string, Value>,
  touched: TouchedKeys
) => {
  if (touched.wholeMap) {
    return map;
  }
  const touchedMap = new Map<string, Value>();
  for (const key of touched.keys) {
    if (map.has(key) === false) {
      continue;
    }
    const value = map.get(key) as Value;
    touchedMap.set(key, value);
  }
  return touchedMap;
};

const validateTouchedMap = <Value>(
  schema: { parse: (value: Map<string, Value>) => unknown },
  map: Map<string, Value>,
  touched: TouchedKeys
) => {
  schema.parse(getTouchedMap(map, touched));
};

export type BuildPatchChange = {
  namespace: string;
  patches: BuilderPatch[];
};

export type BuildPatchTransaction = Omit<BuilderPatchTransaction, "payload"> & {
  payload: BuildPatchChange[];
};

export type BuildPatchUpdateResult =
  | {
      status: "ok";
      update?: Database["public"]["Tables"]["Build"]["Update"];
      nextVersion: number;
      assetPatches: Patch[][];
      previewImageAssetId?: string | null;
    }
  | { status: "version_mismatched"; errors: string }
  | { status: "error"; errors: string };

export const singlePlayerVersionMismatchError =
  "You are currently in single-player mode. The project has been edited in a different tab, browser, or by another user. Realtime collaboration, also known as multiplayer, is available on the Team plan and helps avoid this conflict. Please reload the page to get the latest version.";

export const singlePlayerVersionMismatchResult = {
  status: "version_mismatched",
  errors: singlePlayerVersionMismatchError,
} as const satisfies BuildPatchUpdateResult;

export const createBuildPatchUpdate = async ({
  build,
  clientVersion,
  transactions,
}: {
  build: Database["public"]["Tables"]["Build"]["Row"];
  clientVersion: number;
  transactions: BuildPatchTransaction[];
}): Promise<BuildPatchUpdateResult> => {
  const lastTransactionId = transactions.at(-1)?.id;

  if (lastTransactionId === undefined) {
    return {
      status: "error",
      errors: "Transaction array must not be empty.",
    };
  }

  const serverVersion = build.version;
  if (clientVersion !== serverVersion) {
    if (lastTransactionId === build.lastTransactionId) {
      return { status: "ok", assetPatches: [], nextVersion: serverVersion };
    }

    return singlePlayerVersionMismatchResult;
  }

  const buildData: {
    pages?: Pages;
    breakpoints?: Breakpoints;
    instances?: Instances;
    props?: Props;
    dataSources?: DataSources;
    resources?: Resources;
    styleSources?: StyleSources;
    styleSourceSelections?: StyleSourceSelections;
    styles?: Styles;
    marketplaceProduct?: MarketplaceProduct;
    projectSettings?: ProjectSettings;
  } = {};

  let previewImageAssetId: string | null | undefined = undefined;
  const touchedBreakpoints = createTouchedKeys();
  const touchedDataSources = createTouchedKeys();
  const touchedInstances = createTouchedKeys();
  const touchedProps = createTouchedKeys();
  const touchedResources = createTouchedKeys();
  const touchedStyles = createTouchedKeys();
  const touchedStyleSources = createTouchedKeys();
  const touchedStyleSourceSelections = createTouchedKeys();
  const assetPatches: Patch[][] = [];

  for (const transaction of transactions) {
    for (const change of transaction.payload) {
      const { namespace, patches } = change;
      if (patches.length === 0) {
        continue;
      }

      if (namespace === "pages") {
        const pages = buildData.pages ?? parsePages(build.pages);
        const currentSocialImageAssetId =
          getHomePage(pages).meta.socialImageAssetId;
        buildData.pages = applyBuildNamespacePatches("pages", pages, patches);
        const newSocialImageAssetId = getHomePage(buildData.pages).meta
          .socialImageAssetId;
        if (currentSocialImageAssetId !== newSocialImageAssetId) {
          previewImageAssetId = newSocialImageAssetId || null;
        }
        continue;
      }

      if (namespace === "projectSettings") {
        const projectSettings =
          buildData.projectSettings ??
          parseConfig<ProjectSettings>(build.projectSettings);
        const nextProjectSettings = applyBuildNamespacePatches(
          "projectSettings",
          projectSettings,
          patches
        );
        buildData.projectSettings = nextProjectSettings;
        continue;
      }

      if (namespace === "instances") {
        addTouchedPatchKeys(touchedInstances, patches);
        const instances =
          buildData.instances ?? parseInstanceData(build.instances);

        buildData.instances = applyBuildNamespacePatches(
          "instances",
          instances,
          patches
        );

        const cycles = findCycles(buildData.instances?.values() ?? []);
        if (cycles.length > 0) {
          console.error(
            "Cycles detected in the instance tree after patching",
            cycles
          );

          return {
            status: "error",
            errors: "Cycles detected in the instance tree",
          };
        }

        continue;
      }

      if (namespace === "props") {
        addTouchedPatchKeys(touchedProps, patches);
        const props = buildData.props ?? parseData<Prop>(build.props);
        buildData.props = applyBuildNamespacePatches("props", props, patches);
        continue;
      }

      if (namespace === "assets") {
        assetPatches.push(patches);
        continue;
      }

      if (namespace === "styleSourceSelections") {
        addTouchedPatchKeys(touchedStyleSourceSelections, patches);
        const styleSourceSelections =
          buildData.styleSourceSelections ??
          parseStyleSourceSelections(build.styleSourceSelections);
        buildData.styleSourceSelections = applyBuildNamespacePatches(
          "styleSourceSelections",
          styleSourceSelections,
          patches
        );
        continue;
      }

      if (namespace === "styleSources") {
        addTouchedPatchKeys(touchedStyleSources, patches);
        const styleSources =
          buildData.styleSources ?? parseData<StyleSource>(build.styleSources);
        buildData.styleSources = applyBuildNamespacePatches(
          "styleSources",
          styleSources,
          patches
        );
        continue;
      }

      if (namespace === "styles") {
        addTouchedPatchKeys(touchedStyles, patches);

        const styles = buildData.styles ?? parseStyles(build.styles);
        buildData.styles = applyBuildNamespacePatches(
          "styles",
          styles,
          patches
        );
        continue;
      }

      if (namespace === "dataSources") {
        addTouchedPatchKeys(touchedDataSources, patches);
        const dataSources =
          buildData.dataSources ?? parseData<DataSource>(build.dataSources);
        buildData.dataSources = applyBuildNamespacePatches(
          "dataSources",
          dataSources,
          patches
        );
        continue;
      }

      if (namespace === "resources") {
        addTouchedPatchKeys(touchedResources, patches);
        const resources =
          buildData.resources ?? parseData<Resource>(build.resources);
        buildData.resources = applyBuildNamespacePatches(
          "resources",
          resources,
          patches
        );
        continue;
      }

      if (namespace === "breakpoints") {
        addTouchedPatchKeys(touchedBreakpoints, patches);
        const breakpoints =
          buildData.breakpoints ?? parseData<Breakpoint>(build.breakpoints);
        buildData.breakpoints = applyBuildNamespacePatches(
          "breakpoints",
          breakpoints,
          patches
        );
        continue;
      }

      if (namespace === "marketplaceProduct") {
        const marketplaceProduct =
          buildData.marketplaceProduct ??
          parseConfig<MarketplaceProduct>(build.marketplaceProduct);

        buildData.marketplaceProduct = applyBuildNamespacePatches(
          "marketplaceProduct",
          marketplaceProduct,
          patches
        );

        continue;
      }

      return { status: "error", errors: `Unknown namespace "${namespace}"` };
    }
  }

  const update: Database["public"]["Tables"]["Build"]["Update"] = {
    version: clientVersion + 1,
    lastTransactionId,
    updatedAt: new Date().toISOString(),
  };

  if (buildData.pages) {
    const pagesData = buildData.pages;
    update.pages = serializePages(pages.parse(pagesData));
  }

  if (buildData.breakpoints) {
    const breakpointsData = buildData.breakpoints;
    validateTouchedMap(breakpoints, breakpointsData, touchedBreakpoints);
    update.breakpoints = serializeData<Breakpoint>(breakpointsData);
  }

  if (buildData.instances) {
    const instancesData = buildData.instances;
    validateTouchedMap(instances, instancesData, touchedInstances);
    update.instances = serializeData<Instance>(instancesData);
  }

  if (buildData.props) {
    const propsData = buildData.props;
    validateTouchedMap(props, propsData, touchedProps);
    update.props = serializeData<Prop>(propsData);
  }

  if (buildData.dataSources) {
    const dataSourcesData = buildData.dataSources;
    validateTouchedMap(dataSources, dataSourcesData, touchedDataSources);
    update.dataSources = serializeData<DataSource>(dataSourcesData);
  }

  if (buildData.resources) {
    const resourcesData = buildData.resources;
    validateTouchedMap(resources, resourcesData, touchedResources);
    update.resources = serializeData<Resource>(resourcesData);
  }

  if (buildData.styleSources) {
    const styleSourcesData = buildData.styleSources;
    validateTouchedMap(styleSources, styleSourcesData, touchedStyleSources);
    update.styleSources = serializeData<StyleSource>(styleSourcesData);
  }

  if (buildData.styleSourceSelections) {
    const styleSourceSelectionsData = buildData.styleSourceSelections;
    validateTouchedMap(
      styleSourceSelections,
      styleSourceSelectionsData,
      touchedStyleSourceSelections
    );
    update.styleSourceSelections = serializeStyleSourceSelections(
      styleSourceSelectionsData
    );
  }

  if (buildData.styles) {
    const stylesData = buildData.styles;
    validateTouchedMap(styles, stylesData, touchedStyles);
    update.styles = serializeStyles(stylesData);
  }

  if (buildData.marketplaceProduct) {
    const marketplaceProductData = buildData.marketplaceProduct;
    update.marketplaceProduct = serializeConfig<MarketplaceProduct>(
      marketplaceProduct.parse(marketplaceProductData)
    );
  }

  if (buildData.projectSettings) {
    update.projectSettings = serializeConfig<ProjectSettings>(
      buildData.projectSettings
    );
  }

  return {
    status: "ok",
    assetPatches,
    update,
    nextVersion: clientVersion + 1,
    previewImageAssetId,
  };
};
