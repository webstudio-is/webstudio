import {
  type ChildrenUpdates,
  type Instance,
  type Project,
  type Tree,
} from "@webstudio-is/sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";
import {
  reparentInstance,
  setInstanceStyle,
  setInstanceChildren,
  createInstance,
  type InstanceReparentingSpec,
} from "~/shared/tree-utils";
import type { StyleUpdates } from "~/shared/component";

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

export const loadByDomain = async (domain: string): Promise<Tree> => {
  const project = await prisma.project.findUnique({
    where: { domain },
  });
  if (project === null) {
    throw new Error(`Unknown domain "${domain}"`);
  }
  if (project.prodTreeId === null) {
    throw new Error(`Site is not published`);
  }
  return await loadById(project.prodTreeId);
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

export const reparent = async (
  id: string,
  instanceReparentingSpec: InstanceReparentingSpec
) => {
  // @todo reparent without loading the entire tree
  const tree = await loadById(id);
  const root = reparentInstance(tree.root, instanceReparentingSpec);
  await prisma.tree.update({
    data: { root },
    where: { id },
  });
};

export const updateStyles = async (id: string, styleUpdates: StyleUpdates) => {
  // @todo we need to update without fetching the tree
  const tree = await loadById(id);
  const root = setInstanceStyle(
    tree.root,
    styleUpdates.id,
    styleUpdates.updates
  );
  await prisma.tree.update({
    data: { root },
    where: { id },
  });
};

export const updateChildren = async (
  id: string,
  change: { instanceId: Instance["id"]; updates: ChildrenUpdates }
) => {
  // @todo we need to update without fetching the tree
  const tree = await loadById(id);
  const root = setInstanceChildren(
    change.instanceId,
    change.updates,
    tree.root
  );
  await prisma.tree.update({
    data: { root },
    where: { id },
  });
};

export const clone = async (id: string) => {
  const tree = await loadById(id);
  return await create(tree.root);
};

export const patchRoot = async (treeId: Tree["id"], patches: Array<Patch>) => {
  const tree = await loadById(treeId);
  const root = applyPatches(tree.root, patches);
  await prisma.tree.update({
    data: { root },
    where: { id: treeId },
  });
};
