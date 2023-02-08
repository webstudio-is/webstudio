import { applyPatches, type Patch } from "immer";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import {
  type Tree,
  type InstancesItem,
  Instance,
  Instances,
  StyleSourceSelections,
} from "@webstudio-is/project-build";
import { prisma, type Prisma } from "@webstudio-is/prisma-client";
import { utils } from "../index";
import { parseProps, serializeProps } from "./props";
import type { Project } from "../shared/schema";
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
  const instances: Instances = [];
  normalizeTree(root, instances);

  return {
    projectId,
    buildId,
    root,
    props: [],
    styleSourceSelections: [],
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

  const styleSourceSelections: StyleSourceSelections =
    treeData.styleSourceSelections;

  return await client.tree.create({
    data: {
      id: newTreeId,
      projectId: treeData.projectId,
      buildId: treeData.buildId,
      root: "",
      styles: "",
      instances: JSON.stringify(instances),
      props: serializeProps(new Map(treeData.props)),
      styleSelections: JSON.stringify(styleSourceSelections),
    },
  });
};

export const deleteById = async ({
  projectId,
  treeId,
}: {
  projectId: Project["id"];
  treeId: Tree["id"];
}): Promise<void> => {
  await prisma.tree.delete({
    where: {
      id_projectId: { projectId, id: treeId },
    },
  });
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
  { projectId, treeId }: { projectId: Project["id"]; treeId: Tree["id"] },
  context: AppContext,
  client: Prisma.TransactionClient = prisma
): Promise<Tree | null> => {
  const tree = await client.tree.findUnique({
    where: {
      id_projectId: { projectId, id: treeId },
    },
  });
  if (tree === null) {
    return null;
  }

  const instances = Instances.parse(JSON.parse(tree.instances));
  const root = Instance.parse(denormalizeTree(instances));

  const props = await parseProps(
    { propsString: tree.props, projectId },
    context
  );

  const styleSourceSelections = StyleSourceSelections.parse(
    JSON.parse(tree.styleSelections)
  );

  return {
    ...tree,
    root,
    props: Array.from(props),
    styleSourceSelections,
  };
};

export const clone = async (
  from: { projectId: Project["id"]; treeId: Tree["id"] },
  to: { projectId: Project["id"]; buildId: Project["id"] },
  context: AppContext,
  client: Prisma.TransactionClient = prisma
) => {
  const tree = await loadById(from, context, client);
  if (tree === null) {
    throw new Error(`Tree ${from.projectId}/${from.treeId} not found`);
  }

  return await create({ ...tree, ...to }, client);
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

  const tree = await loadById({ projectId, treeId }, context);
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
    where: {
      id_projectId: { projectId, id: treeId },
    },
  });
};
