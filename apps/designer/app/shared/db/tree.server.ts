import {
  type Instance,
  type Breakpoint,
  type Tree,
  InstanceSchema,
} from "@webstudio-is/react-sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import { createInstance, populateInstance } from "~/shared/tree-utils";
import { sort } from "~/shared/breakpoints";
import { Tree as DbTree } from "@prisma/client";
import { Project } from "./project.server";

export const createRootInstance = (breakpoints: Array<Breakpoint>) => {
  // Take the smallest breakpoint as default
  const defaultBreakpoint = sort(breakpoints)[0];
  if (defaultBreakpoint === undefined) {
    throw new Error("A breakpoint with minWidth 0 is required");
  }
  const instance = createInstance({ component: "Body" });
  return populateInstance(instance, defaultBreakpoint.id);
};

export const create = async (root: Instance): Promise<DbTree> => {
  InstanceSchema.parse(root);
  const rootString = JSON.stringify(root);
  return await prisma.tree.create({
    data: { root: rootString },
  });
};

export const loadById = async (treeId: string): Promise<Tree | null> => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) return null;

  const root = JSON.parse(tree.root);
  InstanceSchema.parse(root);
  return {
    ...tree,
    root,
  };
};

// export const loadByProject = async (
//   project: Project | null,
//   env: "production" | "development" = "development"
// ) => {
//   if (project === null) {
//     throw new Error("Project required");
//   }

//   const treeId = env === "production" ? project.prodTreeId : project.devTreeId;

//   if (treeId === null) {
//     throw new Error("Site needs to be published, production tree ID is null.");
//   }

//   return await loadById(treeId);
// };

export const clone = async (treeId: string) => {
  const tree = await loadById(treeId);
  if (tree === null) {
    throw new Error(`Tree ${treeId} not found`);
  }
  return await create(tree.root);
};

export const patchRoot = async (
  { treeId }: { treeId: Tree["id"] },
  patches: Array<Patch>
) => {
  const tree = await loadById(treeId);
  if (tree === null) {
    throw new Error(`Tree ${treeId} not found`);
  }
  const root = applyPatches(tree.root, patches);
  InstanceSchema.parse(root);
  await prisma.tree.update({
    data: { root: JSON.stringify(root) },
    where: { id: treeId },
  });
};
