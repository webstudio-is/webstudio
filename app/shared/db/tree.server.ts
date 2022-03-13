import { type ChildrenUpdates, type Instance } from "@webstudio-is/sdk";
import { prisma } from "./prisma.server";
import {
  insertInstance,
  reparentInstance,
  setInstanceStyle,
  setInstanceChildren,
  deleteInstance as deleteInstanceFromTree,
  createInstance,
  type InstanceInsertionSpec,
  type InstanceReparentingSpec,
} from "~/shared/tree-utils";
import type { StyleUpdates } from "~/shared/component";
import { deleteProps } from "./props.server";

export type Tree = {
  id: string;
  root: Instance;
};

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

export const load = async (id: string): Promise<Tree> => {
  return (await prisma.tree.findUnique({
    where: { id },
  })) as Tree;
};

export const loadForDomain = async (domain: string): Promise<Tree> => {
  const project = await prisma.project.findUnique({
    where: { domain },
  });
  if (project === null) {
    throw new Error(`Unknown domain "${domain}"`);
  }
  if (project.prodTreeId === null) {
    throw new Error(`Site is not published`);
  }
  return await load(project.prodTreeId);
};

export const insert = async (
  id: string,
  instanceInsertionSpec: InstanceInsertionSpec
) => {
  // @todo insert without loading the entire tree
  const tree = await load(id);
  const { instance: root } = insertInstance(instanceInsertionSpec, tree.root, {
    populate: false,
  });
  await prisma.tree.update({
    data: { root },
    where: { id },
  });
};

export const reparent = async (
  id: string,
  instanceReparentingSpec: InstanceReparentingSpec
) => {
  // @todo reparent without loading the entire tree
  const tree = await load(id);
  const root = reparentInstance(tree.root, instanceReparentingSpec);
  await prisma.tree.update({
    data: { root },
    where: { id },
  });
};

export const updateStyles = async (id: string, styleUpdates: StyleUpdates) => {
  // @todo we need to update without fetching the tree
  const tree = await load(id);
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
  const tree = await load(id);
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

export const deleteInstance = async (
  id: string,
  instanceId: Instance["id"]
) => {
  // @todo we need to delete without fetching the tree
  const tree = await load(id);
  const root = deleteInstanceFromTree(tree.root, instanceId);
  if (root === null) return;
  await prisma.tree.update({
    data: { root },
    where: { id },
  });
  await deleteProps(instanceId);
};

export const clone = async (id: string) => {
  const tree = await load(id);
  return await create(tree.root);
};
