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
import { type Breakpoint, SharedStyleValue } from "@webstudio-is/css-data";
import { z } from "zod";
import DataLoader from "dataloader";
import warnOnce from "warn-once";

const assetsLoader = new DataLoader<string, Asset | undefined>(
  async (assetIds) => {
    const assets = await prisma.asset.findMany({
      where: {
        id: {
          in: [...assetIds],
        },
      },
    });

    return assetIds.map((assetId) =>
      assets.find((asset) => asset.id === assetId)
    );
  }
);

const ImageDBAsset = z.object({
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

const ImageDbValue = z.object({
  type: z.literal("image"),
  value: z
    .array(ImageDBAsset)
    // Asset can be not present in DB, skip it
    .transform((assets) => assets.filter((asset) => asset.value !== undefined)),
});

const StyleDbValue = z.union([SharedStyleValue, ImageDbValue]);

const StyleDb = z.record(z.string(), StyleDbValue);

export const CssDbRule = z.object({
  style: StyleDb,
  breakpoint: z.optional(z.string()),
});

const InstanceDb = z.lazy(
  () =>
    z.object({
      type: z.literal("instance"),
      id: z.string(),
      component: z.string(),
      children: z.array(z.union([InstanceDb, Text])),
      cssRules: z.array(CssDbRule),
    })
  // @todo can't figure out how to make component to be z.enum(Object.keys(components))
) as z.ZodType<Instance>;

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
  root: Instance,
  client: Prisma.TransactionClient = prisma
): Promise<DbTree> => {
  Instance.parse(root);
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

  const root = JSON.parse(tree.root);

  const instance = await InstanceDb.parseAsync(root);

  Instance.parse(instance);

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
  const root = applyPatches(tree.root, patches);
  Instance.parse(root);
  await prisma.tree.update({
    data: { root: JSON.stringify(root) },
    where: { id: treeId },
  });
};
