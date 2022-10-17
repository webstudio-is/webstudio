import {
  initialBreakpoints,
  Breakpoint,
  Breakpoints,
} from "@webstudio-is/react-sdk";
import ObjectId from "bson-objectid";
import { applyPatches, type Patch } from "immer";
import {
  type Breakpoints as DbBreakpoints,
  prisma,
} from "@webstudio-is/prisma-client";

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
  buildId: DbBreakpoints["buildId"],
  patches: Array<Patch>
) => {
  const breakpoints = await load(buildId);
  const nextValues = applyPatches(breakpoints.values, patches);

  Breakpoints.parse(nextValues);

  await prisma.breakpoints.update({
    where: { buildId: breakpoints.buildId },
    data: { values: JSON.stringify(nextValues) },
  });
};
