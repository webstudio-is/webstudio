import {
  type Instance,
  type UserPropsUpdates,
  type UserProp,
} from "@webstudio-is/sdk";
import { prisma } from "./prisma.server";
import { type Tree } from "./tree.server";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";

export const loadForTree = async (treeId: Tree["id"]) => {
  return await prisma.instanceProps.findMany({
    where: { treeId },
  });
};

const loadForInstance = async (id: Instance["id"]) => {
  return await prisma.instanceProps.findUnique({
    where: { id },
  });
};

export const update = async (
  instanceId: Instance["id"],
  treeId: Tree["id"],
  updates: UserPropsUpdates["updates"]
) => {
  // @todo update in one command, remove queueing logic on the ui
  // as of prisma client v3.10.0 updating composite types like in this doc didn't work
  // https://www.prisma.io/docs/concepts/components/prisma-client/composite-types
  const props = (await loadForInstance(instanceId))?.props ?? [];

  for (const update of updates) {
    const index = props.findIndex((prop) => update.id == prop.id);
    if (index === -1) props.push(update);
    else props.splice(index, 1, update);
  }

  await prisma.instanceProps.upsert({
    where: { id: instanceId },
    create: { id: instanceId, treeId, props },
    update: {
      props,
    },
  });
};

export const deleteOne = async (
  instanceId: Instance["id"],
  propId: UserProp["id"]
) => {
  // @todo update in one command, remove queueing logic on the ui
  // as of prisma client v3.10.0 updating composite types like in this doc didn't work
  // https://www.prisma.io/docs/concepts/components/prisma-client/composite-types
  const props = (await loadForInstance(instanceId))?.props ?? [];
  const index = props.findIndex((prop) => prop.id == propId);
  if (index === -1) return;
  props.splice(index, 1);

  await prisma.instanceProps.update({
    where: { id: instanceId },
    data: { props },
  });
};

export const deleteProps = async (id: Instance["id"]) => {
  try {
    await prisma.instanceProps.delete({ where: { id } });
  } catch (error: unknown) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      // Record to delete does not exist.
      error.code === "P2025"
    ) {
      return;
    }

    throw error;
  }
};
