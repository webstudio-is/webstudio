import {
  initialBreakpoints,
  type Project,
  type Tree,
  type Breakpoint,
} from "@webstudio-is/sdk";
import ObjectId from "bson-objectid";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";

export const load = async (treeId?: Tree["id"]) => {
  if (typeof treeId !== "string") {
    throw new Error("Tree ID required");
  }

  return await prisma.breakpoints.findUnique({
    where: { treeId },
  });
};

export const getBreakpointsWithId = () =>
  initialBreakpoints.map((breakpoint) => ({
    ...breakpoint,
    id: ObjectId().toString(),
  }));

export const create = async (
  treeId: Project["id"],
  breakpoints: Array<Breakpoint>
) => {
  const data = {
    treeId,
    values: breakpoints,
  };
  await prisma.breakpoints.create({ data });
  return data;
};

export const clone = async ({
  previousTreeId,
  nextTreeId,
}: {
  previousTreeId: Tree["id"];
  nextTreeId: Tree["id"];
}) => {
  const breakpoints = await load(previousTreeId);
  if (breakpoints === null) {
    throw new Error(`Didn't find breakpoints with tree id "${previousTreeId}"`);
  }
  await create(nextTreeId, breakpoints.values);
};

export const patch = async (
  { treeId }: { treeId: Tree["id"]; projectId: Project["id"] },
  patches: Array<Patch>
) => {
  const breakpoints = await load(treeId);
  if (breakpoints === null) return;
  const nextBreakpoints = applyPatches(breakpoints.values, patches);
  await prisma.breakpoints.update({
    where: { treeId },
    data: { values: nextBreakpoints },
  });
};
