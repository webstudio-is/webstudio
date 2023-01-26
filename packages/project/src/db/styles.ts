import warnOnce from "warn-once";
import { type Patch, applyPatches } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";
import { formatAsset } from "@webstudio-is/asset-uploader/server";
import { StoredStyles, Styles } from "@webstudio-is/project-build";

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

export const parseStyles = async (stylesString: string) => {
  const storedStyles = StoredStyles.parse(JSON.parse(stylesString));

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

  const styles: Styles = storedStyles.map((stylesItem) => {
    return {
      breakpointId: stylesItem.breakpointId,
      instanceId: stylesItem.instanceId,
      property: stylesItem.property,
      value: parseValue(stylesItem.value, assetsMap),
    };
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

export const serializeStyles = (styles: Styles) => {
  const storedStyles: StoredStyles = styles.map((stylesItem) => {
    return {
      breakpointId: stylesItem.breakpointId,
      instanceId: stylesItem.instanceId,
      property: stylesItem.property,
      value: serializeValue(stylesItem.value),
    };
  });
  return JSON.stringify(storedStyles);
};

export const patch = async (
  { treeId }: { treeId: string },
  patches: Array<Patch>
) => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });
  if (tree === null) {
    return;
  }
  const styles = await parseStyles(tree.styles);
  const patchedStyles = Styles.parse(applyPatches(styles, patches));

  await prisma.tree.update({
    data: {
      styles: serializeStyles(patchedStyles),
    },
    where: { id: treeId },
  });
};
