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
  const patchedStyleDeclKeysSet = new Set<string>();
  const assetPatches: Patch[][] = [];

  for await (const transaction of transactions) {
    for await (const change of transaction.payload) {
      const { namespace, patches } = change;
      if (patches.length === 0) {
        continue;
      }

      if (namespace === "pages") {
        const pages = buildData.pages ?? parsePages(build.pages);
        const currentSocialImageAssetId =
          getHomePage(pages).meta.socialImageAssetId;
        buildData.pages = applyPatches(pages, patches);
        const newSocialImageAssetId = getHomePage(buildData.pages).meta
          .socialImageAssetId;
        if (currentSocialImageAssetId !== newSocialImageAssetId) {
          previewImageAssetId = newSocialImageAssetId || null;
        }
        continue;
      }

      if (namespace === "instances") {
        const instances =
          buildData.instances ?? parseInstanceData(build.instances);

        buildData.instances = applyPatches(instances, patches);

        const cycles = findCycles(buildData.instances.values());
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
        const props = buildData.props ?? parseData<Prop>(build.props);
        buildData.props = applyPatches(props, patches);
        continue;
      }

      if (namespace === "assets") {
        assetPatches.push(patches);
        continue;
      }

      if (namespace === "styleSourceSelections") {
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
        const styleSources =
          buildData.styleSources ?? parseData<StyleSource>(build.styleSources);
        buildData.styleSources = applyPatches(styleSources, patches);
        continue;
      }

      if (namespace === "styles") {
        for (const patch of patches) {
          patchedStyleDeclKeysSet.add(`${patch.path[0]}`);
        }

        const styles = buildData.styles ?? parseStyles(build.styles);
        buildData.styles = applyPatches(styles, patches);
        continue;
      }

      if (namespace === "dataSources") {
        const dataSources =
          buildData.dataSources ?? parseData<DataSource>(build.dataSources);
        buildData.dataSources = applyPatches(dataSources, patches);
        continue;
      }

      if (namespace === "resources") {
        const resources =
          buildData.resources ?? parseData<Resource>(build.resources);
        buildData.resources = applyPatches(resources, patches);
        continue;
      }

      if (namespace === "breakpoints") {
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
    update.pages = serializePages(Pages.parse(buildData.pages));
  }

  if (buildData.breakpoints) {
    update.breakpoints = serializeData<Breakpoint>(
      Breakpoints.parse(buildData.breakpoints)
    );
  }

  if (buildData.instances) {
    update.instances = serializeData<Instance>(
      Instances.parse(buildData.instances)
    );
  }

  if (buildData.props) {
    update.props = serializeData<Prop>(Props.parse(buildData.props));
  }

  if (buildData.dataSources) {
    update.dataSources = serializeData<DataSource>(
      DataSources.parse(buildData.dataSources)
    );
  }

  if (buildData.resources) {
    update.resources = serializeData<Resource>(
      Resources.parse(buildData.resources)
    );
  }

  if (buildData.styleSources) {
    update.styleSources = serializeData<StyleSource>(
      StyleSources.parse(buildData.styleSources)
    );
  }

  if (buildData.styleSourceSelections) {
    update.styleSourceSelections = serializeStyleSourceSelections(
      StyleSourceSelections.parse(buildData.styleSourceSelections)
    );
  }

  if (buildData.styles) {
    const stylesToValidate: Styles = new Map();
    for (const styleId of patchedStyleDeclKeysSet) {
      const style = buildData.styles.get(styleId);
      if (style === undefined) {
        continue;
      }
      stylesToValidate.set(styleId, style);
    }

    Styles.parse(stylesToValidate);
    update.styles = serializeStyles(buildData.styles);
  }

  if (buildData.marketplaceProduct) {
    update.marketplaceProduct = serializeConfig<MarketplaceProduct>(
      MarketplaceProduct.parse(buildData.marketplaceProduct)
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
