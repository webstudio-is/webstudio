import { applyPatches, type Patch } from "immer";
import { z } from "zod";
import {
  type Tree,
  type ComponentName,
  type InstancesItem,
  Instance,
  PresetStyles,
  findMissingPresetStyles,
  Styles,
  Instances,
} from "@webstudio-is/react-sdk";
import {
  prisma,
  type Prisma,
  type Tree as DbTree,
} from "@webstudio-is/prisma-client";
import { utils } from "../index";
import { StylesDbIn, StylesDbOut } from "./styles";

type TreeData = Omit<Tree, "id">;

const normalizeTree = (instance: Instance, instances: InstancesItem[]) => {
  const instancesItem: InstancesItem = {
    type: "instance",
    id: instance.id,
    component: instance.component,
    children: [],
  };
  instances.push(instancesItem);
  for (const child of instance.children) {
    if (child.type === "instance") {
      normalizeTree(child, instances);
      instancesItem.children.push({ type: "id", value: child.id });
    } else {
      instancesItem.children.push(child);
    }
  }
};

export const createTree = (): TreeData => {
  const root = utils.tree.createInstance({ component: "Body" });
  const presetStyles = findMissingPresetStyles([], [root.component]);
  const styles: Styles = [];
  const instances: Instances = [];
  normalizeTree(root, instances);

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
  const instances: Instances = [];
  normalizeTree(root, instances);

  return await client.tree.create({
    data: {
      root: "",
      instances: JSON.stringify(instances),
      presetStyles: JSON.stringify(treeData.presetStyles),
      styles: JSON.stringify(await StylesDbIn.parseAsync(treeData.styles)),
    },
  });
};

export const deleteById = async (treeId: Tree["id"]): Promise<void> => {
  await prisma.tree.delete({ where: { id: treeId } });
};

const denormalizeTree = (instances: z.infer<typeof Instances>) => {
  const instancesMap: Record<string, z.infer<typeof InstancesItem>> = {};
  for (const instance of instances) {
    instancesMap[instance.id] = instance;
  }
  const convertTree = (instance: z.infer<typeof InstancesItem>) => {
    const legacyInstance: Instance = {
      type: "instance",
      id: instance.id,
      component: instance.component as ComponentName,
      children: [],
    };
    for (const child of instance.children) {
      if (child.type === "id") {
        legacyInstance.children.push(convertTree(instancesMap[child.value]));
      } else {
        legacyInstance.children.push(child);
      }
    }
    return legacyInstance;
  };
  return convertTree(instances[0]);
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

  const instances = Instances.parse(JSON.parse(tree.instances));
  const root = Instance.parse(denormalizeTree(instances));

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
  const instances: Instances = [];
  normalizeTree(root, instances);

  await prisma.tree.update({
    data: {
      root: "",
      instances: JSON.stringify(instances),
      presetStyles: JSON.stringify(presetStyles),
    },
    where: { id: treeId },
  });
};
