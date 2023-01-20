import warnOnce from "warn-once";
import DataLoader from "dataloader";
import { type Patch, applyPatches } from "immer";
import { type Asset, prisma } from "@webstudio-is/prisma-client";
import { formatAsset } from "@webstudio-is/asset-uploader/server";
import { StoredStyles, Styles } from "@webstudio-is/react-sdk";

const assetsLoader = new DataLoader<string, Asset | undefined>(
  async (assetIds) => {
    const assets = await prisma.asset.findMany({
      where: {
        id: {
          // Spread to remove readonly from assetIds, otherwise ts error.
          in: [...assetIds],
        },
      },
    });

    /**
     * Dataloader docs:
     * The Array of values must be the same length as the Array of keys.
     * Each index in the Array of values must correspond to the same index in the Array of keys.
     * (assets returned from DB can have a different order, some could not exist)
     */
    return assetIds.map((assetId) =>
      assets.find((asset) => asset.id === assetId)
    );
  }
);

/**
 * Use DataLoader to load/format assets from the Assets table.
 */
const loadAsset = async (assetId: string) => {
  const asset = await assetsLoader.load(assetId);
  if (asset === undefined) {
    warnOnce(true, `Asset with assetId "${assetId}" not found`);
    return;
  }

  return formatAsset(asset);
};

const loadValue = async (styleValue: StoredStyles[number]["value"]) => {
  if (styleValue.type === "image") {
    return {
      type: "image" as const,
      value: (
        await Promise.all(
          styleValue.value.map(async (item) => {
            const asset = await loadAsset(item.value);
            if (asset?.type === "image") {
              return [
                {
                  type: "asset" as const,
                  value: asset,
                },
              ];
            }
            return [];
          })
        )
      ).flat(),
    };
  } else {
    return styleValue;
  }
};

export const parseStyles = async (stylesString: string) => {
  const storedStyles = StoredStyles.parse(JSON.parse(stylesString));
  const styles: Styles = await Promise.all(
    storedStyles.map(async (stylesItem) => {
      return {
        breakpointId: stylesItem.breakpointId,
        instanceId: stylesItem.instanceId,
        property: stylesItem.property,
        value: await loadValue(stylesItem.value),
      };
    })
  );

  return styles;
};

/**
 * prepare value to store in db
 */
const prepareValue = (styleValue: Styles[number]["value"]) => {
  if (styleValue.type === "image") {
    return {
      type: "image" as const,
      value: styleValue.value.map((asset) => ({
        type: asset.type,
        /**
         * In the DB we hold only assetId
         **/
        value: asset.value.id,
      })),
    };
  } else {
    return styleValue;
  }
};

export const serializeStyles = (styles: Styles) => {
  const storedStyles: StoredStyles = styles.map((stylesItem) => {
    return {
      breakpointId: stylesItem.breakpointId,
      instanceId: stylesItem.instanceId,
      property: stylesItem.property,
      value: prepareValue(stylesItem.value),
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
