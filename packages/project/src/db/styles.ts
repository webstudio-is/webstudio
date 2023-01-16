import { z } from "zod";
import warnOnce from "warn-once";
import DataLoader from "dataloader";
import { type Patch, applyPatches } from "immer";
import { type Asset, prisma } from "@webstudio-is/prisma-client";
import { formatAsset } from "@webstudio-is/asset-uploader/server";
import {
  type StyleProperty,
  ImageValue,
  SharedStyleValue,
} from "@webstudio-is/css-data";

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
 * Use zod + DataLoader to load/format assets from the Assets table.
 */
const ImageAssetDbOut = z.object({
  type: z.literal("asset"),
  value: z
    .string()
    .uuid()
    .transform(async (assetId) => {
      const asset = await assetsLoader.load(assetId);
      if (asset === undefined) {
        warnOnce(true, `Asset with assetId "${assetId}" not found`);
        return;
      }

      return formatAsset(asset);
    }),
});

const ImageValueDbOut = z.object({
  type: z.literal("image"),
  value: z
    .array(ImageAssetDbOut)
    // an Asset can be not present in DB, skip it.
    .transform((assets) => assets.filter((asset) => asset.value !== undefined)),
});

const StyleValueDbOut = z.union([SharedStyleValue, ImageValueDbOut]);

const StylesItemDbOut = z.object({
  breakpointId: z.string(),
  instanceId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: StyleValueDbOut,
});

export const StylesDbOut = z.array(StylesItemDbOut);

/**
 * In the DB we hold only assetId
 **/
const ImageValueDbIn = ImageValue.transform((imageStyle) => ({
  type: imageStyle.type,
  value: imageStyle.value.map((value) =>
    /* Now value.type is always equal to the "asset", but in the future, it will have additional types */
    value.type === "asset" ? { type: "asset", value: value.value.id } : value
  ),
}));

const StyleValueDbIn = z.union([SharedStyleValue, ImageValueDbIn]);

const StylesItemDbIn = z.object({
  breakpointId: z.string(),
  instanceId: z.string(),
  // @todo can't figure out how to make property to be enum
  property: z.string() as z.ZodType<StyleProperty>,
  value: StyleValueDbIn,
});

export const StylesDbIn = z.array(StylesItemDbIn);

const loadStylesByTreeId = async (treeId: string) => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) {
    return [];
  }

  return StylesDbOut.parse(JSON.parse(tree.styles));
};

export const patch = async (
  { treeId }: { treeId: string },
  patches: Array<Patch>
) => {
  const styles = await loadStylesByTreeId(treeId);
  const patchedStyles = StylesDbIn.parse(applyPatches(styles, patches));

  await prisma.tree.update({
    data: {
      styles: JSON.stringify(patchedStyles),
    },
    where: { id: treeId },
  });
};
