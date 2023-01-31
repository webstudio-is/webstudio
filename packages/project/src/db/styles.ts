import warnOnce from "warn-once";
import ObjectId from "bson-objectid";
import { type Patch, applyPatches } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";
import { formatAsset } from "@webstudio-is/asset-uploader/server";
import {
  type Instance,
  StoredStyles,
  Styles,
  type StyleSource,
  StyleSources,
  StyleSourceSelections,
  type Tree,
} from "@webstudio-is/project-build";
import type { Project } from "./schema";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

const parseValue = (
  styleValue: StoredStyles[number]["value"],
  assetsMap: Map<string, Asset>
) => {
  if (styleValue.type === "image") {
    return {
      type: "image" as const,
      value: styleValue.value.flatMap((item) => {
        const asset = assetsMap.get(item.value);
        if (asset === undefined) {
          warnOnce(true, `Asset with assetId "${item.value}" not found`);
          return [];
        }
        if (asset.type === "image") {
          return [
            {
              type: "asset" as const,
              value: asset,
            },
          ];
        }
        return [];
      }),
    };
  }
  return styleValue;
};

export const parseStyles = async (
  treeId: string,
  stylesString: string,
  styleSourcesString: string,
  styleSourceSelectionsString: string
) => {
  const styleSources = StyleSources.parse(JSON.parse(styleSourcesString));
  const styleSourceSelections = StyleSourceSelections.parse(
    JSON.parse(styleSourceSelectionsString)
  );
  const storedStyles = StoredStyles.parse(JSON.parse(stylesString));

  const instanceIdByStyleSourceId = new Map<
    StyleSource["id"],
    Instance["id"]
  >();
  const currentTreeStyleSources = new Set<StyleSource["id"]>();

  for (const styleSource of styleSources) {
    if (styleSource.type === "local" && styleSource.treeId === treeId) {
      currentTreeStyleSources.add(styleSource.id);
    }
  }

  for (const stylesSourceSelection of styleSourceSelections) {
    for (const styleSourceId of stylesSourceSelection.values) {
      instanceIdByStyleSourceId.set(
        styleSourceId,
        stylesSourceSelection.instanceId
      );
    }
  }

  const assetIds: string[] = [];
  for (const { value: styleValue } of storedStyles) {
    if (styleValue.type === "image") {
      for (const item of styleValue.value) {
        if (item.type === "asset") {
          assetIds.push(item.value);
        }
      }
    }
  }

  // Load all assets
  const assets = await prisma.asset.findMany({
    where: {
      id: {
        in: assetIds,
      },
    },
  });
  const assetsMap = new Map<string, Asset>();
  for (const asset of assets) {
    assetsMap.set(asset.id, formatAsset(asset));
  }

  const styles: Styles = storedStyles.flatMap((styleDecl) => {
    if (currentTreeStyleSources.has(styleDecl.styleSourceId) === false) {
      return [];
    }
    const instanceId = instanceIdByStyleSourceId.get(styleDecl.styleSourceId);
    if (instanceId === undefined) {
      return [];
    }
    const clientStyle = {
      breakpointId: styleDecl.breakpointId,
      instanceId,
      property: styleDecl.property,
      value: parseValue(styleDecl.value, assetsMap),
    };
    return [clientStyle];
  });

  return styles;
};

/**
 * prepare value to store in db
 */
const serializeValue = (styleValue: Styles[number]["value"]) => {
  if (styleValue.type === "image") {
    return {
      type: "image" as const,
      value: styleValue.value.map((asset) => ({
        type: asset.type,
        // only asset id is stored in db
        value: asset.value.id,
      })),
    };
  }
  return styleValue;
};

export const convertToStoredStyles = (
  treeId: string,
  styles: Styles,
  styleSources: StyleSources,
  styleSourceSelections: StyleSourceSelections
): StoredStyles => {
  const styleSourceIdByInstanceId = new Map<
    Instance["id"],
    StyleSource["id"]
  >();

  for (const stylesSourceSelection of styleSourceSelections) {
    for (const styleSourceId of stylesSourceSelection.values) {
      styleSourceIdByInstanceId.set(
        stylesSourceSelection.instanceId,
        styleSourceId
      );
    }
  }

  const storedStyles: StoredStyles = styles.map((styleDecl) => {
    const { instanceId } = styleDecl;
    let styleSourceId = styleSourceIdByInstanceId.get(instanceId);
    if (styleSourceId === undefined) {
      styleSourceId = ObjectId().toString();
      styleSourceSelections.push({
        instanceId,
        values: [styleSourceId],
      });
      styleSources.push({
        type: "local",
        id: styleSourceId,
        treeId,
      });
    }
    return {
      breakpointId: styleDecl.breakpointId,
      styleSourceId,
      property: styleDecl.property,
      value: serializeValue(styleDecl.value),
    };
  });
  return storedStyles;
};

export const serializeStyles = (
  treeId: string,
  styles: Styles,
  styleSources: StyleSources,
  styleSourceSelections: StyleSourceSelections
) => {
  const styleSourceIdByInstanceId = new Map<
    Instance["id"],
    StyleSource["id"]
  >();

  for (const stylesSourceSelection of styleSourceSelections) {
    for (const styleSourceId of stylesSourceSelection.values) {
      styleSourceIdByInstanceId.set(
        stylesSourceSelection.instanceId,
        styleSourceId
      );
    }
  }

  const storedStyles: StoredStyles = styles.map((styleDecl) => {
    const { instanceId } = styleDecl;
    let styleSourceId = styleSourceIdByInstanceId.get(instanceId);
    if (styleSourceId === undefined) {
      styleSourceId = ObjectId().toString();
      styleSourceSelections.push({
        instanceId,
        values: [styleSourceId],
      });
      styleSources.push({
        type: "local",
        id: styleSourceId,
        treeId,
      });
    }
    return {
      breakpointId: styleDecl.breakpointId,
      styleSourceId,
      property: styleDecl.property,
      value: serializeValue(styleDecl.value),
    };
  });
  return JSON.stringify(storedStyles);
};

export const patch = async (
  { treeId, projectId }: { treeId: Tree["id"]; projectId: Project["id"] },
  patches: Array<Patch>,
  context: AppContext
) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );

  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });
  if (tree === null) {
    return;
  }

  const build = await prisma.build.findUnique({
    where: { id: tree.buildId },
  });
  if (build === null) {
    return null;
  }

  const storedStyles = StoredStyles.parse(JSON.parse(build.styles));
  const styleSources = StyleSources.parse(JSON.parse(build.styleSources));
  const styleSourceSelections = StyleSourceSelections.parse(
    JSON.parse(tree.styleSelections)
  );

  // these styles are filtered by treeId
  const treeStyles = await parseStyles(
    treeId,
    build.styles,
    build.styleSources,
    tree.styleSelections
  );

  const patchedTreeStyles = Styles.parse(applyPatches(treeStyles, patches));

  const currentTreeStyleSources = new Set<StyleSource["id"]>();
  for (const styleSource of styleSources) {
    if (styleSource.type === "local" && styleSource.treeId === treeId) {
      currentTreeStyleSources.add(styleSource.id);
    }
  }

  // exclude all current tree styles and append patched styles to the end
  const patchedStoredStyles = storedStyles.filter(
    (styleDecl) =>
      currentTreeStyleSources.has(styleDecl.styleSourceId) === false
  );
  patchedStoredStyles.push(
    ...convertToStoredStyles(
      treeId,
      patchedTreeStyles,
      styleSources,
      styleSourceSelections
    )
  );

  await prisma.build.update({
    data: {
      styles: JSON.stringify(patchedStoredStyles),
      styleSources: JSON.stringify(styleSources),
    },
    where: { id: build.id },
  });

  await prisma.tree.update({
    data: {
      styleSelections: JSON.stringify(styleSourceSelections),
    },
    where: { id: treeId },
  });
};
