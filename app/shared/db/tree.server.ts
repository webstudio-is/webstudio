import { type Instance, type Breakpoint, type Tree } from "@webstudio-is/sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";
import { createInstance } from "~/shared/tree-utils";
import { sort } from "~/shared/breakpoints";
import { Tree as DbTree } from "@prisma/client";
import { Project } from "./project.server";

export const createRootInstance = (breakpoints: Array<Breakpoint>) => {
  // Take the smallest breakpoint as default
  const defaultBreakpoint = sort(breakpoints)[0];
  if (defaultBreakpoint === undefined) {
    throw new Error("A breakpoint with minWidth 0 is required");
  }
  // @todo this should be part of a root primitive in primitives
  const rootConfig: Pick<Instance, "component" | "cssRules"> = {
    component: "Box",
    cssRules: [
      {
        breakpoint: defaultBreakpoint.id,
        style: {
          backgroundColor: {
            type: "keyword",
            value: "white",
          },
          fontFamily: {
            type: "keyword",
            value: "Arial",
          },
          fontSize: {
            type: "unit",
            unit: "px",
            value: 14,
          },
          lineHeight: {
            type: "unit",
            unit: "px",
            value: 20,
          },
          color: {
            type: "keyword",
            value: "#232323",
          },
          minHeight: {
            type: "unit",
            unit: "vh",
            value: 100,
          },
          flexDirection: {
            type: "keyword",
            value: "column",
          },
        },
      },
    ],
  };
  return createInstance(rootConfig);
};

export const create = async (root: Instance): Promise<DbTree> => {
  const newRoot = JSON.stringify(root);
  return await prisma.tree.create({
    data: { root: newRoot },
  });
};

export const loadById = async (treeId: string): Promise<Tree | null> => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) return null;

  return {
    ...tree,
    root: JSON.parse(tree.root),
  };
};

export const loadByProject = async (
  project: Project | null,
  env: "production" | "development" = "development"
) => {
  if (project === null) {
    throw new Error("Project required");
  }

  const treeId = env === "production" ? project.prodTreeId : project.devTreeId;

  if (treeId === null) {
    throw new Error("Site needs to be published, production tree ID is null.");
  }

  return await loadById(treeId);
};

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
  await prisma.tree.update({
    data: { root: JSON.stringify(root) },
    where: { id: treeId },
  });
};
