import warnOnce from "warn-once";
import {
  type Tree,
  type AllUserProps,
  type UserProp,
  // @todo move zod schema into project package
  UserProps,
  UserDbProps,
} from "@webstudio-is/react-sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import { formatAsset } from "@webstudio-is/asset-uploader/server";

export const loadByTreeId = async (treeId: Tree["id"]) => {
  const instancePropsEntries = await prisma.instanceProps.findMany({
    where: { treeId },
  });

  // Fin all assetId in all props
  const assetIds: string[] = [];

  for (const instanceProps of instancePropsEntries) {
    const props = JSON.parse(instanceProps.props);
    const dpProps = UserDbProps.parse(props);

    for (const dbProp of dpProps) {
      if (dbProp.assetId != null) {
        assetIds.push(dbProp.assetId);
      }
    }
  }
  // Load all assets
  const assets = await prisma.asset.findMany({
    where: {
      id: {
        in: assetIds,
      },
    },
  });

  const assetsMap = new Map(
    assets.map((asset) => [asset.id, formatAsset(asset)])
  );

  return instancePropsEntries.map((instanceProps) => {
    const props = JSON.parse(instanceProps.props);
    const userProps: UserProp[] = [];
    // Can be changed onto `props as ` having that above is already checked, no optmizations now
    const dpProps = UserDbProps.parse(props);

    for (const dbProp of dpProps) {
      if (dbProp.assetId == null) {
        userProps.push(dbProp);
        continue;
      }

      const { assetId, ...userProp } = dbProp;
      const asset = assetsMap.get(assetId);

      if (asset) {
        userProps.push({
          ...userProp,
          asset,
        });
      } else {
        userProps.push(userProp);
        warnOnce(true, `Asset with assetId "${assetId}" not found`);
      }
    }

    return {
      ...instanceProps,
      props: userProps,
    };
  });
};

export const deleteByTreeId = async (treeId: Tree["id"]) => {
  await prisma.instanceProps.deleteMany({ where: { treeId } });
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
      const propsDb: UserDbProps = UserProps.parse(props).map((prop) => {
        const { asset, ...rest } = prop;
        return { ...rest, assetId: asset?.id };
      });

      const propsString = JSON.stringify(propsDb);

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
