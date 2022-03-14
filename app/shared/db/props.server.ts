import {
  type Instance,
  type UserPropsUpdates,
  type UserProp,
  type Project,
  type InstanceProps,
  type Tree,
} from "@webstudio-is/sdk";
import { prisma, PrismaClientKnownRequestError } from "./prisma.server";

export const loadByProject = async (
  project: Project | null,
  env: "production" | "development" = "development"
) => {
  if (project === null) {
    throw new Error("Project required");
  }

  const treeId = env === "production" ? project.prodTreeId : project.devTreeId;

  if (treeId === null) {
    throw new Error("Site needs to be published, production tree ID is null.");
  }

  return await prisma.instanceProps.findMany({
    where: { treeId },
  });
};

const loadById = async (id: InstanceProps["id"]) => {
  return await prisma.instanceProps.findUnique({
    where: { id },
  });
};

export const update = async ({
  propsId,
  instanceId,
  treeId,
  updates,
}: {
  propsId: InstanceProps["id"];
  instanceId: Instance["id"];
  treeId: Tree["id"];
  updates: UserPropsUpdates["updates"];
}) => {
  // @todo update in one command, remove queueing logic on the ui
  // as of prisma client v3.10.0 updating composite types like in this doc didn't work
  // https://www.prisma.io/docs/concepts/components/prisma-client/composite-types
  const props = (await loadById(propsId))?.props ?? [];

  for (const update of updates) {
    const index = props.findIndex((prop) => update.id == prop.id);
    if (index === -1) props.push(update);
    else props.splice(index, 1, update);
  }

  console.log({ props, updates });

  //console.log({
  //  where: { id: propsId },
  //  create: { instanceId, treeId, props },
  //  update: {
  //    props,
  //  },
  //});
  await prisma.instanceProps.upsert({
    where: { id: propsId },
    create: { instanceId, treeId, props },
    update: {
      props,
    },
  });
};

export const deleteOne = async (
  id: InstanceProps["id"],
  propId: UserProp["id"]
) => {
  // @todo update in one command, remove queueing logic on the ui
  // as of prisma client v3.10.0 updating composite types like in this doc didn't work
  // https://www.prisma.io/docs/concepts/components/prisma-client/composite-types
  const props = (await loadById(id))?.props ?? [];
  const index = props.findIndex((prop) => prop.id == propId);
  if (index === -1) return;
  props.splice(index, 1);

  await prisma.instanceProps.update({
    where: { id },
    data: { props },
  });
};

export const deleteProps = async (id: InstanceProps["id"]) => {
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

export const publish = async ({
  previousTreeId,
  nextTreeId,
}: {
  previousTreeId: string;
  nextTreeId: string;
}) => {
  const props = await prisma.instanceProps.findMany({
    where: { treeId: previousTreeId },
  });
  const data = props.map(({ id, treeId, ...rest }) => ({
    ...rest,
    treeId: nextTreeId,
  }));
  await prisma.instanceProps.createMany({
    data,
  });
};
