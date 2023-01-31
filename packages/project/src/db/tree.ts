import { applyPatches, type Patch } from "immer";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import {
  type Tree,
  type InstancesItem,
  Instance,
  Instances,
  type Styles,
  type Props,
  StyleSourceSelections,
  StyleSources,
  StoredStyles,
} from "@webstudio-is/project-build";
import { prisma, type Prisma } from "@webstudio-is/prisma-client";
import { utils } from "../index";
import { convertToStoredStyles, parseStyles } from "./styles";
import { parseProps, serializeProps } from "./props";
import type { Project } from "./schema";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

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

export const createTree = ({
  projectId,
  buildId,
}: {
  projectId: string;
  buildId: string;
}): TreeData => {
  const root = utils.tree.createInstance({ component: "Body" });
  const styles: Styles = [];
  const instances: Instances = [];
  normalizeTree(root, instances);
  const props: Props = [];

  return {
    projectId,
    buildId,
    root,
    props,
    styles,
  };
};

export const create = async (
  treeData: TreeData,
  client: Prisma.TransactionClient = prisma
) => {
  const root = Instance.parse(treeData.root);
  const instances: Instances = [];
  normalizeTree(root, instances);

  const newTreeId = uuid();

  const build = await client.build.findUnique({
    where: {
      id: treeData.buildId,
    },
  });

  if (build === null) {
    throw Error(`Build ${treeData.buildId} not found`);
  }

  const storedStyles = StoredStyles.parse(JSON.parse(build.styles));
  const styleSources = StyleSources.parse(JSON.parse(build.styleSources));
  const styleSourceSelections: StyleSourceSelections = [];
  storedStyles.push(
    ...convertToStoredStyles(
      newTreeId,
      treeData.styles,
      styleSources,
      styleSourceSelections
    )
  );

  await client.build.update({
    where: {
      id: treeData.buildId,
    },
    data: {
      styles: JSON.stringify(storedStyles),
      styleSources: JSON.stringify(styleSources),
    },
  });

  return await client.tree.create({
    data: {
      id: newTreeId,
      projectId: treeData.projectId,
      buildId: treeData.buildId,
      root: "",
      styles: "",
      instances: JSON.stringify(instances),
      props: serializeProps(treeData.props),
      styleSelections: JSON.stringify(styleSourceSelections),
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
      component: instance.component,
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

  const build = await client.build.findUnique({
    where: { id: tree.buildId },
  });
  if (build === null) {
    return null;
  }

  const instances = Instances.parse(JSON.parse(tree.instances));
  const root = Instance.parse(denormalizeTree(instances));

  const props = await parseProps(tree.props);
  const styles = await parseStyles(
    treeId,
    build.styles,
    build.styleSources,
    tree.styleSelections
  );

  return {
    ...tree,
    root,
    props,
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

  const tree = await loadById(treeId);
  if (tree === null) {
    throw new Error(`Tree ${treeId} not found`);
  }
  const clientRoot = applyPatches(tree.root, patches);

  const root = Instance.parse(clientRoot);
  const instances: Instances = [];
  normalizeTree(root, instances);

  await prisma.tree.update({
    data: {
      root: "",
      instances: JSON.stringify(instances),
    },
    where: { id: treeId },
  });
};
