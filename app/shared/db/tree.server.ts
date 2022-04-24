import { type Instance, type Project, type Tree } from "@webstudio-is/sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";
import { createInstance } from "~/shared/tree-utils";

const rootConfig = {
  // @todo this should be part of a root primitive in primitives
  component: "Box",
  style: {
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
} as const;

export const create = async (root?: Instance): Promise<Tree> => {
  return (await prisma.tree.create({
    data: { root: root ?? createInstance(rootConfig) },
  })) as Tree;
};

export const loadById = async (id: string): Promise<Tree> => {
  return (await prisma.tree.findUnique({
    where: { id },
  })) as Tree;
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

export const clone = async (id: string) => {
  const tree = await loadById(id);
  return await create(tree.root);
};

export const patchRoot = async (
  { treeId }: { treeId: Tree["id"] },
  patches: Array<Patch>
) => {
  const tree = await loadById(treeId);
  const root = applyPatches(tree.root, patches);
  await prisma.tree.update({
    data: { root },
    where: { id: treeId },
  });
};
