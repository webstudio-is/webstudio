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
    include: {
      values: true,
    },
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
  await prisma.breakpoints.create({
    data: {
      treeId,
    },
  });
  const all = breakpoints.map(
    async (breakpoint: Breakpoint) =>
      await prisma.breakpoints.update({
        where: { treeId },
        data: {
          values: {
            create: breakpoint,
          },
        },
      })
  );

  await Promise.all(all);
  return {
    treeId,
    breakpoints,
  };
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
  const updateAll = nextBreakpoints.map(
    async (nextBreakpoint) =>
      await prisma.breakpoints.update({
        where: { treeId },
        data: {
          values: {
            create: {
              ...nextBreakpoint,
            },
          },
        },
      })
  );

  await Promise.all(updateAll);
};
