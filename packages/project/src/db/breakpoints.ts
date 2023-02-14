import { nanoid } from "nanoid";
import { applyPatches, type Patch } from "immer";
import { initialBreakpoints } from "@webstudio-is/react-sdk";
import {
  type Breakpoints as DbBreakpoints,
  prisma,
} from "@webstudio-is/prisma-client";
import { BreakpointsList } from "@webstudio-is/project-build";
import type { Project } from "../shared/schema";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

export const createValues = (): BreakpointsList => {
  return initialBreakpoints.map((breakpoint) => ({
    ...breakpoint,
    id: nanoid(),
  }));
};

export const patch = async (
  {
    buildId,
    projectId,
  }: { buildId: DbBreakpoints["buildId"]; projectId: Project["id"] },
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
  const breakpoints = BreakpointsList.parse(JSON.parse(build.breakpoints));
  const patchedBreakpoints = BreakpointsList.parse(
    applyPatches(breakpoints, patches)
  );

  await prisma.build.update({
    where: {
      id_projectId: { id: buildId, projectId },
    },
    data: { breakpoints: JSON.stringify(patchedBreakpoints) },
  });
};
