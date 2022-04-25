import {
  initialBreakpoints,
  sort,
  type Project,
  type Tree,
} from "@webstudio-is/sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";

export const create = async (projectId: Project["id"]) => {
  const data = initialBreakpoints.map((breakpoint) => ({
    ...breakpoint,
    projectId,
  }));
  // https://github.com/prisma/prisma/issues/8131
  // @todo run this in parallel
  const breakpoints = await prisma.$transaction(
    data.map((breakpoint) => prisma.breakpoint.create({ data: breakpoint }))
  );
  return breakpoints;
};

export const load = async (projectId: Project["id"]) => {
  const breakpoints = await prisma.breakpoint.findMany({
    where: { projectId },
  });
  return sort(breakpoints);
};

export const patch = async (
  { projectId }: { treeId: Tree["id"]; projectId: Project["id"] },
  patches: Array<Patch>
) => {
  const breakpoints = await load(projectId);
  const nextBreakpoints = applyPatches(breakpoints, patches);

  await Promise.all(
    Object.values(nextBreakpoints).map(async (breakpoint) => {
      const { id, ...rest } = breakpoint;
      await prisma.breakpoint.upsert({
        where: { id },
        create: breakpoint,
        update: rest,
      });
    })
  );
};
