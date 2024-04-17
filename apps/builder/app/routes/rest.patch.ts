import { applyPatches } from "immer";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import type { SyncItem } from "immerhin";
import { prisma } from "@webstudio-is/prisma-client";
import {
  Breakpoints,
  Breakpoint,
  Instances,
  Instance,
  Pages,
  Props,
  Prop,
  DataSources,
  DataSource,
  StyleSourceSelections,
  StyleSources,
  StyleSource,
  Styles,
  Resources,
  Resource,
} from "@webstudio-is/sdk";
import { type Build, MarketplaceProduct } from "@webstudio-is/project-build";
import {
  parsePages,
  parseStyleSourceSelections,
  parseStyles,
  serializePages,
  serializeStyleSourceSelections,
  serializeStyles,
  parseData,
  serializeData,
  parseConfig,
  serializeConfig,
} from "@webstudio-is/project-build/index.server";
import { patchAssets } from "@webstudio-is/asset-uploader/index.server";
import type { Project } from "@webstudio-is/project";
import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { createContext } from "~/shared/context.server";
import { db } from "@webstudio-is/project/index.server";

type PatchData = {
  transactions: Array<SyncItem>;
  buildId: Build["id"];
  projectId: Project["id"];
  version: number;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const {
      buildId,
      projectId,
      transactions,
      version: clientVersion,
    }: PatchData = await request.json();
    if (buildId === undefined) {
      return { errors: "Build id required" };
    }
    if (projectId === undefined) {
      return { errors: "Project id required" };
    }

    const lastTransactionId = transactions.at(-1)?.transactionId;

    if (lastTransactionId === undefined) {
      return { errors: "Transaction array must not be empty." };
    }

    const context = await createContext(request);
    const canEdit = await authorizeProject.hasProjectPermit(
      { projectId, permit: "edit" },
      context
    );
    if (canEdit === false) {
      throw Error("You don't have edit access to this project");
    }

    // await new Promise((r) => setTimeout(r, 10000));

    const build = await prisma.build.findUnique({
      where: { id_projectId: { projectId, id: buildId } },
    });
    if (build === null) {
      throw Error(`Build ${buildId} not found`);
    }

    const serverVersion = build.version;
    if (clientVersion !== serverVersion) {
      // Check if a retry attempt is made with a previously successful transaction.
      // This can occur if the connection was lost or an error occurred post-transaction completion,
      // leaving the client in an erroneous state and prompting a retry.
      if (lastTransactionId === build.lastTransactionId) {
        return { status: "ok" };
      }

      return {
        status: "version_mismatched",
      };
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

    // Used to optimize by validating only changed styles, as they accounted for 99% of validation time
    const patchedStyleDeclKeysSet = new Set<string>();

    for await (const transaction of transactions) {
      for await (const change of transaction.changes) {
        const { namespace, patches } = change;
        if (patches.length === 0) {
          continue;
        }

        if (namespace === "pages") {
          // lazily parse build data before patching
          const pages = buildData.pages ?? parsePages(build.pages);
          const currentSocialImageAssetId =
            pages.homePage.meta.socialImageAssetId;
          buildData.pages = applyPatches(pages, patches);
          const newSocialImageAssetId =
            buildData.pages.homePage.meta.socialImageAssetId;
          if (currentSocialImageAssetId !== newSocialImageAssetId) {
            previewImageAssetId = newSocialImageAssetId || null;
          }
          continue;
        }

        if (namespace === "instances") {
          const instances =
            buildData.instances ?? parseData<Instance>(build.instances);
          buildData.instances = applyPatches(instances, patches);
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
            buildData.styleSources ??
            parseData<StyleSource>(build.styleSources);
          buildData.styleSources = applyPatches(styleSources, patches);
          continue;
        }

        if (namespace === "styles") {
          // It's somehow implementation detail leak, as we use the fact that styles patches has ids in path
          for (const patch of patches) {
            patchedStyleDeclKeysSet.add(`${patch.path[0]}`);
          }

          const styles = buildData.styles ?? parseStyles(build.styles);
          buildData.styles = applyPatches(styles, patches);
          continue;
        }

        if (namespace === "props") {
          const props = buildData.props ?? parseData<Prop>(build.props);
          buildData.props = applyPatches(props, patches);
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

        if (namespace === "assets") {
          // assets implements own patching
          // @todo parallelize the updates
          // currently not possible because we fetch the entire tree
          // and parallelized updates will cause unpredictable side effects
          await patchAssets({ projectId }, patches, context);
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

        return { errors: `Unknown namespace "${namespace}"` };
      }
    }

    // save build data when all patches applied
    const dbBuildData: Parameters<typeof prisma.build.update>[0]["data"] = {
      version: clientVersion + 1,
      lastTransactionId,
    };

    if (buildData.pages) {
      // parse with zod before serialization to avoid saving invalid data
      dbBuildData.pages = serializePages(Pages.parse(buildData.pages));
    }

    if (buildData.breakpoints) {
      dbBuildData.breakpoints = serializeData<Breakpoint>(
        Breakpoints.parse(buildData.breakpoints)
      );
    }

    if (buildData.instances) {
      dbBuildData.instances = serializeData<Instance>(
        Instances.parse(buildData.instances)
      );
    }

    if (buildData.props) {
      dbBuildData.props = serializeData<Prop>(Props.parse(buildData.props));
    }

    if (buildData.dataSources) {
      dbBuildData.dataSources = serializeData<DataSource>(
        DataSources.parse(buildData.dataSources)
      );
    }

    if (buildData.resources) {
      dbBuildData.resources = serializeData<Resource>(
        Resources.parse(buildData.resources)
      );
    }

    if (buildData.styleSources) {
      dbBuildData.styleSources = serializeData<StyleSource>(
        StyleSources.parse(buildData.styleSources)
      );
    }
    if (buildData.styleSourceSelections) {
      dbBuildData.styleSourceSelections = serializeStyleSourceSelections(
        StyleSourceSelections.parse(buildData.styleSourceSelections)
      );
    }

    if (buildData.styles) {
      // Optimize by validating only changed styles, as they accounted for 99% of validation time
      const stylesToValidate: Styles = new Map();
      for (const styleId of patchedStyleDeclKeysSet) {
        const style = buildData.styles.get(styleId);
        // In case of deletion style could be undefined
        if (style === undefined) {
          continue;
        }

        stylesToValidate.set(styleId, style);
      }

      Styles.parse(stylesToValidate);

      dbBuildData.styles = serializeStyles(buildData.styles);
    }

    if (buildData.marketplaceProduct) {
      dbBuildData.marketplaceProduct = serializeConfig<MarketplaceProduct>(
        MarketplaceProduct.parse(buildData.marketplaceProduct)
      );
    }

    const { count } = await prisma.build.updateMany({
      data: dbBuildData,
      where: {
        projectId,
        id: buildId,
        version: clientVersion,
      },
    });

    // ensure only build with client version is updated
    // to avoid race conditions
    if (count === 0) {
      // We don't validate if lastTransactionId matches the user's transaction ID here, as we've already done so earlier.
      // Given the sequential nature of messages from a single client, this situation is deemed improbable.
      return {
        status: "version_mismatched",
      };
    }

    if (previewImageAssetId !== undefined) {
      await db.project.updatePreviewImage(
        { assetId: previewImageAssetId, projectId },
        context
      );
    }

    return { status: "ok" };
  } catch (e) {
    return { errors: e instanceof Error ? e.message : JSON.stringify(e) };
  }
};
