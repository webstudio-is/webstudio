import warnOnce from "warn-once";
import { type Tree, StoredProps, Props } from "@webstudio-is/project-build";
import { type AllUserProps, type InstanceProps } from "@webstudio-is/react-sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import { formatAsset } from "@webstudio-is/asset-uploader/server";

export const parseProps = async (propsString: string) => {
  const storedProps = StoredProps.parse(JSON.parse(propsString));

  // find all asset ids in all props
  const assetIds: string[] = [];

  for (const prop of storedProps) {
    if (prop.type === "asset") {
      assetIds.push(prop.value);
    }
  }

  // load all assets
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

  const props: Props = [];
  for (const prop of storedProps) {
    if (prop.type === "asset") {
      const assetId = prop.value;
      const asset = assetsMap.get(assetId);

      if (asset) {
        props.push({
          id: prop.id,
          instanceId: prop.instanceId,
          name: prop.name,
          required: prop.required,
          type: prop.type,
          value: asset,
        });

        continue;
      }

      warnOnce(true, `Asset with assetId "${assetId}" not found`);
      continue;
    }

    props.push(prop);
  }

  return props;
};

export const loadByTreeId = async (treeId: Tree["id"]) => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) {
    return [];
  }

  const props = await parseProps(tree.props);

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
    instanceProps.props.push(propsItem);
  }

  return Array.from(instancePropsMap.values());
};

export const serializeProps = (props: Props) => {
  const storedProps: StoredProps = [];
  for (const prop of props) {
    if (prop.type === "asset") {
      storedProps.push({
        id: prop.id,
        instanceId: prop.instanceId,
        name: prop.name,
        required: prop.required,
        type: prop.type,
        value: prop.value.id,
      });
      continue;
    }
    storedProps.push(prop);
  }
  return JSON.stringify(storedProps);
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

  const props: Props = Object.values(nextProps).flat();

  await prisma.tree.update({
    data: {
      props: serializeProps(props),
    },
    where: { id: treeId },
  });
};
