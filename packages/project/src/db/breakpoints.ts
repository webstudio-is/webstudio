import { nanoid } from "nanoid";
import { applyPatches, type Patch } from "immer";
import { initialBreakpoints } from "@webstudio-is/react-sdk";
import { type Project, prisma } from "@webstudio-is/prisma-client";
import {
  type Build,
  Breakpoint,
  Breakpoints,
  BreakpointsList,
} from "@webstudio-is/project-build";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

export const parseBreakpoints = (breakpointsString: string): Breakpoints => {
  const breakpointssList = BreakpointsList.parse(JSON.parse(breakpointsString));
  return new Map(breakpointssList.map((item) => [item.id, item]));
};

export const serializeBreakpoints = (breakpointssMap: Breakpoints) => {
  const breakpointssList: BreakpointsList = Array.from(
    breakpointssMap.values()
  );
  return JSON.stringify(breakpointssList);
};

export const createValues = (): [Breakpoint["id"], Breakpoint][] => {
  return initialBreakpoints.map((breakpoint) => {
    const id = nanoid();
    return [
      id,
      {
        ...breakpoint,
        id,
      },
    ];
  });
};

export const patch = async (
  { buildId, projectId }: { buildId: Build["id"]; projectId: Project["id"] },
  patches: Array<Patch>,
  context: AppContext
) => {
  const canEdit = await authorizeProject.hasProjectPermit(
    { projectId, permit: "edit" },
    context
  );
  if (canEdit === false) {
    throw new Error("You don't have edit access to this project");
  }

  const build = await prisma.build.findUnique({
    where: {
      id_projectId: { id: buildId, projectId },
    },
  });
  if (build === null) {
    return;
  }

  const breakpoints = parseBreakpoints(build.breakpoints);
  const patchedBreakpoints = Breakpoints.parse(
    applyPatches(breakpoints, patches)
  );

  await prisma.build.update({
    where: {
      id_projectId: { id: buildId, projectId },
    },
    data: { breakpoints: serializeBreakpoints(patchedBreakpoints) },
  });
};
