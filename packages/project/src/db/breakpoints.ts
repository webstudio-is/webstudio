import { initialBreakpoints } from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";
import { applyPatches, type Patch } from "immer";
import {
  type Breakpoints as DbBreakpoints,
  prisma,
  Prisma,
} from "@webstudio-is/prisma-client";
import { type Breakpoint, Breakpoints } from "@webstudio-is/css-data";
import type { Project } from "./schema";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

export const load = async (buildId: DbBreakpoints["buildId"]) => {
  const breakpoints = await prisma.breakpoints.findUnique({
    where: { buildId },
  });

  if (breakpoints === null) {
    throw new Error("Breakpoints not found");
  }
  const values: Array<Breakpoint> = JSON.parse(breakpoints.values);
  Breakpoints.parse(values);
  return {
    ...breakpoints,
    values,
  };
};

export const createValues = () =>
  Breakpoints.parse(
    initialBreakpoints.map((breakpoint) => ({
      ...breakpoint,
      id: ObjectId().toString(),
    }))
  );

export const create = async (
  buildId: DbBreakpoints["buildId"],
  values: Array<Breakpoint>,
  client: Prisma.TransactionClient = prisma
) => {
  const breakpoints = await client.breakpoints.create({
    data: {
      values: JSON.stringify(values),
      buildId,
    },
  });

  return {
    ...breakpoints,
    values,
  };
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

  const breakpoints = await load(buildId);
  const nextValues = applyPatches(breakpoints.values, patches);

  Breakpoints.parse(nextValues);

  await prisma.breakpoints.update({
    where: { buildId: breakpoints.buildId },
    data: { values: JSON.stringify(nextValues) },
  });
};
