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
  prisma,
  type Prisma,
  type Tree as DbTree,
} from "@webstudio-is/prisma-client";
import { utils } from "../index";
import { z } from "zod";
import { StylesDbIn, StylesDbOut } from "./styles";

/**
 * validate/transform DB data schema to the client schema.
 */
const InstanceDbOut = z.lazy(() =>
  z.object({
    type: z.literal("instance"),
    id: z.string(),
    component: z.string(),
    children: z.array(z.union([InstanceDbOut, Text])),
    cssRules: z.optional(z.unknown()),
  })
) as z.ZodType<Instance>;

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
  const root = Instance.parse(treeData.root);

  return await client.tree.create({
    data: {
      root: JSON.stringify(root),
      presetStyles: JSON.stringify(treeData.presetStyles),
      styles: JSON.stringify(await StylesDbIn.parseAsync(treeData.styles)),
    },
  });
};

export const deleteById = async (treeId: Tree["id"]): Promise<void> => {
  await prisma.tree.delete({ where: { id: treeId } });
};

const deleteCssRulesFromInstancesMutable = (instance: Instance) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  delete instance.cssRules;

  for (const child of instance.children) {
    if (child.type === "instance") {
      deleteCssRulesFromInstancesMutable(child);
    }
  }
};

export const loadById = async (
  treeId: Tree["id"],
  client: Prisma.TransactionClient = prisma
): Promise<Tree | null> => {
  const tree = await client.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) {
    return null;
  }

  const dbRoot = JSON.parse(tree.root);

  const root = InstanceDbOut.parse(dbRoot);

  deleteCssRulesFromInstancesMutable(root);

  Instance.parse(root);

  const presetStyles = PresetStyles.parse(JSON.parse(tree.presetStyles));
  const styles = Styles.parse(
    await StylesDbOut.parseAsync(JSON.parse(tree.styles))
  );

  return {
    ...tree,
    root,
    presetStyles,
    styles,
  };
};

export const clone = async (
  treeId: Tree["id"],
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

  const root = Instance.parse(clientRoot);

  await prisma.tree.update({
    data: {
      root: JSON.stringify(root),
      presetStyles: JSON.stringify(presetStyles),
    },
    where: { id: treeId },
  });
};
