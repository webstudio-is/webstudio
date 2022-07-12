import {
  initialBreakpoints,
  type Project,
  type Tree,
  BaseBreakpoint,
  Breakpoint,
} from "@webstudio-is/sdk";
import ObjectId from "bson-objectid";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";

export const load = async (
  treeId?: Tree["id"]
): Promise<{
  treeId: string;
  values: Breakpoint[];
}> => {
  if (typeof treeId !== "string") {
    throw new Error("Tree ID required");
  }

  const breakpoint = await prisma.breakpoints.findUnique({
    where: { treeId },
  });

  if (breakpoint === null) {
    throw new Error("Breakpoint not found");
  }

  return {
    ...breakpoint,
    values: getBreakpointsWithId(JSON.parse(breakpoint.values)),
  };
};

export const getBreakpointsWithId = (
  breakpoints: (BaseBreakpoint | Breakpoint)[] = initialBreakpoints
) =>
  breakpoints.map((breakpoint) => ({
    ...breakpoint,
    id: "id" in breakpoint ? breakpoint.id : ObjectId().toString(),
  }));

export const create = async (
  treeId: Project["id"],
  breakpoints: Array<Breakpoint>
) => {
  const data = {
    treeId,
    values: JSON.stringify(breakpoints),
  };
  await prisma.breakpoints.create({ data });
  return {
    ...data,
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
  await prisma.breakpoints.update({
    where: { treeId },
    data: { values: JSON.stringify(nextBreakpoints) },
  });
};
