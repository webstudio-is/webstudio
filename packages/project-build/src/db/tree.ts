import { nanoid } from "nanoid";
import { v4 as uuid } from "uuid";
import { type Project, type Prisma, prisma } from "@webstudio-is/prisma-client";
import type { AppContext } from "@webstudio-is/trpc-interface/server";
import type { Tree } from "../types";
import { parseInstances, serializeInstances } from "./instances";

type TreeData = Omit<Tree, "id">;

export const createNewTreeData = ({
  projectId,
  buildId,
}: {
  projectId: string;
  buildId: string;
}): TreeData => {
  const instanceId = nanoid();

  return {
    projectId,
    buildId,
    instances: [
      [
        instanceId,
        {
          type: "instance",
          id: instanceId,
          component: "Body",
          children: [],
        },
      ],
    ],
  };
};

export const createTree = async (
  treeData: TreeData,
  client: Prisma.TransactionClient = prisma
) => {
  const newTreeId = uuid();

  return await client.tree.create({
    data: {
      id: newTreeId,
      projectId: treeData.projectId,
      buildId: treeData.buildId,
      root: "",
      styles: "",
      instances: serializeInstances(new Map(treeData.instances)),
    },
  });
};

export const deleteTreeById = async ({
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

export const loadTreeById = async (
  { projectId, treeId }: { projectId: Project["id"]; treeId: Tree["id"] },
  _context: AppContext,
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

  const instances = parseInstances(tree.instances);

  return {
    id: tree.id,
    projectId: tree.projectId,
    buildId: tree.buildId,
    instances: Array.from(instances),
  };
};

export const cloneTree = async (
  from: { projectId: Project["id"]; treeId: Tree["id"] },
  to: { projectId: Project["id"]; buildId: Project["id"] },
  context: AppContext,
  client: Prisma.TransactionClient = prisma
) => {
  const tree = await loadTreeById(from, context, client);
  if (tree === null) {
    throw new Error(`Tree ${from.projectId}/${from.treeId} not found`);
  }

  return await createTree({ ...tree, ...to }, client);
};
