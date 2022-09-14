import {
  type Tree,
  type AllUserProps,
  UserPropsSchema,
} from "@webstudio-is/react-sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "@webstudio-is/prisma-client";

export const loadByTreeId = async (treeId: Tree["id"]) => {
  const instancePropsEntries = await prisma.instanceProps.findMany({
    where: { treeId },
  });

  return instancePropsEntries.map((instanceProps) => {
    const props = JSON.parse(instanceProps.props);
    UserPropsSchema.parse(props);
    return {
      ...instanceProps,
      props,
    };
  });
};

export const clone = async ({
  previousTreeId,
  nextTreeId,
}: {
  previousTreeId: string;
  nextTreeId: string;
}) => {
  const props = await prisma.instanceProps.findMany({
    where: { treeId: previousTreeId },
  });
  if (props.length === 0) return;
  const data = props.map(({ id: _id, treeId: _treeId, ...rest }) => ({
    ...rest,
    treeId: nextTreeId,
  }));

  await prisma.$transaction(
    data.map((prop) =>
      prisma.instanceProps.create({
        data: prop,
      })
    )
  );
};

export const patch = async (
  { treeId }: { treeId: Tree["id"] },
  patches: Array<Patch>
) => {
  const allProps = await loadByTreeId(treeId);

  // We should get rid of this by applying patches on the client to the original
  // model instead of the instanceId map.
  // The map is handy for accessing props, but probably should be just cached interface, not the main data structure.
  const allPropsMapByInstanceId = allProps.reduce((acc, prop) => {
    acc[prop.instanceId] = prop;
    return acc;
  }, {} as AllUserProps);
  const nextProps = applyPatches<AllUserProps>(
    allPropsMapByInstanceId,
    patches
  );

  await Promise.all(
    Object.values(nextProps).map(({ id, instanceId, treeId, props }) => {
      UserPropsSchema.parse(props);
      const propsString = JSON.stringify(props);
      return prisma.instanceProps.upsert({
        where: { id: id },
        create: { id: id, instanceId, treeId, props: propsString },
        update: {
          props: propsString,
        },
      });
    })
  );
};
