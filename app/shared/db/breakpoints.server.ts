import {
  initialBreakpoints,
  type Project,
  defaultBreakpoint,
} from "@webstudio-is/sdk";
import { prisma } from "./prisma.server";

export const create = async (projectId: Project["id"]) => {
  const data = initialBreakpoints
    .filter((breakpoint) => breakpoint.ref !== "default")
    .map((breakpoint) => ({
      ...breakpoint,
      projectId,
    }));
  // https://github.com/prisma/prisma/issues/8131
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
