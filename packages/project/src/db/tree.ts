import { formatAsset } from "@webstudio-is/asset-uploader/server";
import { type Tree, Instance, Text } from "@webstudio-is/react-sdk";
import { applyPatches, type Patch } from "immer";
import {
  Asset,
  prisma,
  type Prisma,
  type Tree as DbTree,
} from "@webstudio-is/prisma-client";
import { utils } from "../index";
import {
  type Breakpoint,
  SharedStyleValue,
  ImageValue,
} from "@webstudio-is/css-data";
import { z } from "zod";
import DataLoader from "dataloader";
import warnOnce from "warn-once";

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

const StyleDbOut = z.record(z.string(), StyleValueDbOut);

export const CssRuleDbOut = z.object({
  style: StyleDbOut,
  breakpoint: z.optional(z.string()),
});

/**
 * validate/transform DB data schema to the client schema.
 */
const InstanceDbOut = z.lazy(() =>
  z.object({
    type: z.literal("instance"),
    id: z.string(),
    component: z.string(),
    children: z.array(z.union([InstanceDbOut, Text])),
    cssRules: z.array(CssRuleDbOut),
  })
) as z.ZodType<Instance>;

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

const StyleDbIn = z.record(z.string(), StyleValueDbIn);

export const CssRuleDbIn = z.object({
  style: StyleDbIn,
  breakpoint: z.optional(z.string()),
});

/**
 * validate/transform client schema into DB data schema.
 */
const InstanceDbIn = z.lazy(() =>
  z.object({
    type: z.literal("instance"),
    id: z.string(),
    component: z.string(),
    children: z.array(z.union([InstanceDbIn, Text])),
    cssRules: z.array(CssRuleDbIn),
  })
) as /* Instance is wrong type here, ImageValue is different after transform. We don't use it anyway */ z.ZodType<Instance>;

export const createRootInstance = (breakpoints: Array<Breakpoint>) => {
  // Take the smallest breakpoint as default
  const defaultBreakpoint = utils.breakpoints.sort(breakpoints)[0];
  if (defaultBreakpoint === undefined) {
    throw new Error("A breakpoint with minWidth 0 is required");
  }
  const instance = utils.tree.createInstance({ component: "Body" });
  return utils.tree.populateInstance(instance, defaultBreakpoint.id);
};

export const create = async (
  clientRoot: Instance,
  client: Prisma.TransactionClient = prisma
): Promise<DbTree> => {
  const root = InstanceDbIn.parse(clientRoot);

  const rootString = JSON.stringify(root);

  return await client.tree.create({
    data: { root: rootString },
  });
};

export const deleteById = async (treeId: string): Promise<void> => {
  await prisma.tree.delete({ where: { id: treeId } });
};

export const loadById = async (
  treeId: string,
  client: Prisma.TransactionClient = prisma
): Promise<Tree | null> => {
  const tree = await client.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) {
    return null;
  }

  const dbRoot = JSON.parse(tree.root);

  const root = await InstanceDbOut.parseAsync(dbRoot);

  Instance.parse(root);

  return {
    ...tree,
    root,
  };
};

export const clone = async (
  treeId: string,
  client: Prisma.TransactionClient = prisma
) => {
  const tree = await loadById(treeId, client);
  if (tree === null) {
    throw new Error(`Tree ${treeId} not found`);
  }
  return await create(tree.root, client);
};

export const patch = async (
  { treeId }: { treeId: Tree["id"] },
  patches: Array<Patch>
) => {
  const tree = await loadById(treeId);
  if (tree === null) {
    throw new Error(`Tree ${treeId} not found`);
  }
  const clientRoot = applyPatches(tree.root, patches);

  const root = InstanceDbIn.parse(clientRoot);

  await prisma.tree.update({
    data: { root: JSON.stringify(root) },
    where: { id: treeId },
  });
};
