import { applyPatches, enableMapSet, enablePatches, type Patch } from "immer";
import {
  Breakpoints,
  type Breakpoint,
  DataSources,
  type DataSource,
  Instances,
  type Instance,
  Pages,
  Props,
  type Prop,
  Resources,
  type Resource,
  StyleSourceSelections,
  StyleSources,
  type StyleSource,
  Styles,
  getHomePage,
} from "@webstudio-is/sdk";
import { migratePages } from "@webstudio-is/project-migrations/pages";
import {
  findCycles,
  MarketplaceProduct,
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
} from "@webstudio-is/project-build";
import type { Database } from "@webstudio-is/postgrest/index.server";

enableMapSet();
enablePatches();

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
  patches: Array<Patch>;
};

export type BuildPatchTransaction = {
  id: string;
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
        buildData.pages = migratePages(applyPatches(pages, patches));
        const newSocialImageAssetId = getHomePage(buildData.pages).meta
          .socialImageAssetId;
        if (currentSocialImageAssetId !== newSocialImageAssetId) {
          previewImageAssetId = newSocialImageAssetId || null;
        }
        continue;
      }

      if (namespace === "instances") {
        addTouchedPatchKeys(touchedInstances, patches);
        const instances =
          buildData.instances ?? parseInstanceData(build.instances);

        buildData.instances = applyPatches(instances, patches);

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
        buildData.props = applyPatches(props, patches);
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
        buildData.styleSourceSelections = applyPatches(
          styleSourceSelections,
          patches
        );
        continue;
      }

      if (namespace === "styleSources") {
        addTouchedPatchKeys(touchedStyleSources, patches);
        const styleSources =
          buildData.styleSources ?? parseData<StyleSource>(build.styleSources);
        buildData.styleSources = applyPatches(styleSources, patches);
        continue;
      }

      if (namespace === "styles") {
        addTouchedPatchKeys(touchedStyles, patches);

        const styles = buildData.styles ?? parseStyles(build.styles);
        buildData.styles = applyPatches(styles, patches);
        continue;
      }

      if (namespace === "dataSources") {
        addTouchedPatchKeys(touchedDataSources, patches);
        const dataSources =
          buildData.dataSources ?? parseData<DataSource>(build.dataSources);
        buildData.dataSources = applyPatches(dataSources, patches);
        continue;
      }

      if (namespace === "resources") {
        addTouchedPatchKeys(touchedResources, patches);
        const resources =
          buildData.resources ?? parseData<Resource>(build.resources);
        buildData.resources = applyPatches(resources, patches);
        continue;
      }

      if (namespace === "breakpoints") {
        addTouchedPatchKeys(touchedBreakpoints, patches);
        const breakpoints =
          buildData.breakpoints ?? parseData<Breakpoint>(build.breakpoints);
        buildData.breakpoints = applyPatches(breakpoints, patches);
        continue;
      }

      if (namespace === "marketplaceProduct") {
        const marketplaceProduct =
          buildData.marketplaceProduct ??
          parseConfig<MarketplaceProduct>(build.marketplaceProduct);

        buildData.marketplaceProduct = applyPatches(
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
    const pages = buildData.pages;
    update.pages = serializePages(Pages.parse(pages));
  }

  if (buildData.breakpoints) {
    const breakpoints = buildData.breakpoints;
    validateTouchedMap(Breakpoints, breakpoints, touchedBreakpoints);
    update.breakpoints = serializeData<Breakpoint>(breakpoints);
  }

  if (buildData.instances) {
    const instances = buildData.instances;
    validateTouchedMap(Instances, instances, touchedInstances);
    update.instances = serializeData<Instance>(instances);
  }

  if (buildData.props) {
    const props = buildData.props;
    validateTouchedMap(Props, props, touchedProps);
    update.props = serializeData<Prop>(props);
  }

  if (buildData.dataSources) {
    const dataSources = buildData.dataSources;
    validateTouchedMap(DataSources, dataSources, touchedDataSources);
    update.dataSources = serializeData<DataSource>(dataSources);
  }

  if (buildData.resources) {
    const resources = buildData.resources;
    validateTouchedMap(Resources, resources, touchedResources);
    update.resources = serializeData<Resource>(resources);
  }

  if (buildData.styleSources) {
    const styleSources = buildData.styleSources;
    validateTouchedMap(StyleSources, styleSources, touchedStyleSources);
    update.styleSources = serializeData<StyleSource>(styleSources);
  }

  if (buildData.styleSourceSelections) {
    const styleSourceSelections = buildData.styleSourceSelections;
    validateTouchedMap(
      StyleSourceSelections,
      styleSourceSelections,
      touchedStyleSourceSelections
    );
    update.styleSourceSelections = serializeStyleSourceSelections(
      styleSourceSelections
    );
  }

  if (buildData.styles) {
    const styles = buildData.styles;
    validateTouchedMap(Styles, styles, touchedStyles);
    update.styles = serializeStyles(styles);
  }

  if (buildData.marketplaceProduct) {
    const marketplaceProduct = buildData.marketplaceProduct;
    update.marketplaceProduct = serializeConfig<MarketplaceProduct>(
      MarketplaceProduct.parse(marketplaceProduct)
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
