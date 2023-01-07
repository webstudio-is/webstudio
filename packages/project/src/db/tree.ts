import { formatAsset } from "@webstudio-is/asset-uploader/server";
import {
  type Tree,
  type ComponentName,
  Instance,
  Text,
  PresetStyles,
  findMissingPresetStyles,
  Styles,
} from "@webstudio-is/react-sdk";
import { applyPatches, type Patch } from "immer";
import {
  Asset,
  prisma,
  type Prisma,
  type Tree as DbTree,
} from "@webstudio-is/prisma-client";
import { utils } from "../index";
import {
  SharedStyleValue,
  ImageValue,
  type CssRule,
  type StyleProperty,
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

type TreeData = Omit<Tree, "id">;

export const createTree = (): TreeData => {
  const root = utils.tree.createInstance({ component: "Body" });
  const presetStyles = findMissingPresetStyles([], [root.component]);
  const styles: Styles = [];

  return {
    root,
    presetStyles,
    styles,
  };
};

export const create = async (
  treeData: TreeData,
  client: Prisma.TransactionClient = prisma
): Promise<DbTree> => {
  const root = InstanceDbIn.parse(treeData.root);

  return await client.tree.create({
    data: {
      root: JSON.stringify(root),
      presetStyles: JSON.stringify(treeData.presetStyles),
      styles: JSON.stringify(treeData.styles),
    },
  });
};

export const deleteById = async (treeId: string): Promise<void> => {
  await prisma.tree.delete({ where: { id: treeId } });
};

const addStylesToInstancesMutable = (instance: Instance, styles: Styles) => {
  const cssRulesMap = new Map<string, CssRule>();
  for (const style of styles) {
    if (instance.id !== style.instanceId) {
      continue;
    }
    let rule = cssRulesMap.get(style.breakpointId);
    if (rule === undefined) {
      rule = {
        breakpoint: style.breakpointId,
        style: {},
      };
      cssRulesMap.set(style.breakpointId, rule);
    }
    rule.style[style.property] = style.value;
  }
  instance.cssRules = Array.from(cssRulesMap.values());

  for (const child of instance.children) {
    if (child.type === "instance") {
      addStylesToInstancesMutable(child, styles);
    }
  }
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

  const presetStyles = PresetStyles.parse(JSON.parse(tree.presetStyles));
  const styles = Styles.parse(JSON.parse(tree.styles));
  addStylesToInstancesMutable(root, styles);

  return {
    ...tree,
    root,
    presetStyles,
    styles,
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
  return await create(tree, client);
};

const collectUsedComponents = (instance: Instance, components: Set<string>) => {
  components.add(instance.component);
  for (const child of instance.children) {
    if (child.type === "instance") {
      collectUsedComponents(child, components);
    }
  }
};

const extractStylesFromInstancesMutable = (
  instance: Instance,
  styles: Styles
) => {
  for (const rule of instance.cssRules) {
    if (rule.breakpoint === undefined) {
      continue;
    }
    for (const [property, value] of Object.entries(rule.style)) {
      styles.push({
        breakpointId: rule.breakpoint,
        instanceId: instance.id,
        property: property as StyleProperty,
        value,
      });
    }
  }
  instance.cssRules = [];

  for (const child of instance.children) {
    if (child.type === "instance") {
      extractStylesFromInstancesMutable(child, styles);
    }
  }
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
  const components = new Set<ComponentName>();
  collectUsedComponents(tree.root, components);
  const missingPresetStyles = findMissingPresetStyles(
    tree.presetStyles,
    Array.from(components)
  );
  const presetStyles = [...tree.presetStyles, ...missingPresetStyles];
  const styles: Styles = [];

  const root = InstanceDbIn.parse(clientRoot);

  extractStylesFromInstancesMutable(root, styles);

  await prisma.tree.update({
    data: {
      root: JSON.stringify(root),
      presetStyles: JSON.stringify(presetStyles),
      styles: JSON.stringify(styles),
    },
    where: { id: treeId },
  });
};
