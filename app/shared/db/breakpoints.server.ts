import {
  initialBreakpoints,
  defaultBreakpoint,
  type Project,
  type Tree,
  type Breakpoint,
} from "@webstudio-is/sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";

export const create = async (projectId: Project["id"]) => {
  const data = initialBreakpoints
    .filter((breakpoint) => breakpoint.ref !== "default")
    .map((breakpoint) => ({
      ...breakpoint,
      projectId,
    }));
  // https://github.com/prisma/prisma/issues/8131
  // @todo run this in parallel
  const breakpoints = await prisma.$transaction(
    data.map((breakpoint) => prisma.breakpoint.create({ data: breakpoint }))
  );
  // DB never contains the default breakpoint
  breakpoints.push(defaultBreakpoint);
  return breakpoints;
};

export const load = async (projectId: Project["id"]) => {
  const breakpoints = await prisma.breakpoint.findMany({
    where: { projectId },
  });
  // DB never contains the default breakpoint
  breakpoints.push(defaultBreakpoint);
  return breakpoints;
};

export const patch = async (
  { projectId }: { treeId: Tree["id"]; projectId: Project["id"] },
  patches: Array<Patch>
) => {
  const breakpoints = await await prisma.breakpoint.findMany({
    where: { projectId },
  });

  const nextBreakpoints = applyPatches<Array<Breakpoint>>(breakpoints, patches);

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
