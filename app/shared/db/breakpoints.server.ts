import { initialBreakpoints, type Project, type Tree } from "@webstudio-is/sdk";
import ObjectId from "bson-objectid";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";

export const load = async (projectId: Project["id"]) => {
  return await prisma.breakpoints.findUnique({
    where: { projectId },
  });
};

export const create = async (projectId: Project["id"]) => {
  const data = {
    projectId,
    values: initialBreakpoints.map((breakpoint) => ({
      ...breakpoint,
      id: ObjectId().toString(),
    })),
  };
  await prisma.breakpoints.create({ data });
  return data;
};

export const patch = async (
  { projectId }: { treeId: Tree["id"]; projectId: Project["id"] },
  patches: Array<Patch>
) => {
  const breakpoints = await load(projectId);
  if (breakpoints === null) return;
  const nextBreakpoints = applyPatches(breakpoints.values, patches);
  await prisma.breakpoints.update({
    where: { projectId: projectId },
    data: { values: nextBreakpoints },
  });
};
