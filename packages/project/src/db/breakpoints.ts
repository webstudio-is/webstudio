import {
  initialBreakpoints,
  type Breakpoint,
  BreakpointsSchema,
} from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";
import { applyPatches, type Patch } from "immer";
import { type Breakpoints, prisma } from "@webstudio-is/prisma-client";

export const load = async (buildId: Breakpoints["buildId"]) => {
  const breakpoints = await prisma.breakpoints.findUnique({
    where: { buildId },
  });

  if (breakpoints === null) {
    throw new Error("Breakpoints not found");
  }
  const values: Array<Breakpoint> = JSON.parse(breakpoints.values);
  BreakpointsSchema.parse(values);
  return {
    ...breakpoints,
    values,
  };
};

export const createValues = () =>
  BreakpointsSchema.parse(
    initialBreakpoints.map((breakpoint) => ({
      ...breakpoint,
      id: ObjectId().toString(),
    }))
  );

export const create = async (
  buildId: Breakpoints["buildId"],
  values: Array<Breakpoint>
) => {
  const breakpoints = await prisma.breakpoints.create({
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
  buildId: Breakpoints["buildId"],
  patches: Array<Patch>
) => {
  const breakpoints = await load(buildId);
  const nextValues = applyPatches(breakpoints.values, patches);

  BreakpointsSchema.parse(nextValues);

  await prisma.breakpoints.update({
    where: { buildId: breakpoints.buildId },
    data: { values: JSON.stringify(nextValues) },
  });
};
