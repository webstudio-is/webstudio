import warnOnce from "warn-once";
import {
  type Tree,
  type AllUserProps,
  type InstanceProps,
  StoredProps,
} from "@webstudio-is/react-sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import { formatAsset } from "@webstudio-is/asset-uploader/server";

export const loadByTreeId = async (treeId: Tree["id"]) => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) {
    return [];
  }

  const props = StoredProps.parse(JSON.parse(tree.props));

  // Fin all assetId in all props
  const assetIds: string[] = [];

  for (const propsItem of props) {
    if (propsItem.type === "asset") {
      assetIds.push(propsItem.value);
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

  const instancePropsMap = new Map<string, InstanceProps>();

  for (const propsItem of props) {
    let instanceProps = instancePropsMap.get(propsItem.instanceId);
    if (instanceProps === undefined) {
      instanceProps = {
        id: "",
        instanceId: propsItem.instanceId,
        treeId,
        props: [],
      };
      instancePropsMap.set(propsItem.instanceId, instanceProps);
    }

    if (propsItem.type === "asset") {
      const assetId = propsItem.value;
      const asset = assetsMap.get(assetId);

      if (asset) {
        instanceProps.props.push({
          id: propsItem.id,
          instanceId: propsItem.instanceId,
          name: propsItem.name,
          required: propsItem.required,
          type: propsItem.type,
          value: asset,
        });

        continue;
      }

      warnOnce(true, `Asset with assetId "${assetId}" not found`);
      continue;
    }

    instanceProps.props.push(propsItem);
  }

  return Array.from(instancePropsMap.values());
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
    acc[prop.instanceId] = prop.props;
    return acc;
  }, {} as AllUserProps);
  const nextProps = applyPatches<AllUserProps>(
    allPropsMapByInstanceId,
    patches
  );

  const props: StoredProps = [];
  for (const [instanceId, instanceProps] of Object.entries(nextProps)) {
    for (const propsItem of instanceProps) {
      if (propsItem.type === "asset") {
        props.push({
          id: propsItem.id,
          instanceId,
          name: propsItem.name,
          required: propsItem.required,
          type: propsItem.type,
          value: propsItem.value.id,
        });
        continue;
      }
      props.push(propsItem);
    }
  }

  await prisma.tree.update({
    data: {
      props: JSON.stringify(props),
    },
    where: { id: treeId },
  });
};
