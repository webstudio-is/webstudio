import warnOnce from "warn-once";
import { type Tree, StoredProps, Props } from "@webstudio-is/project-build";
import { applyPatches, type Patch } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import { formatAsset } from "@webstudio-is/asset-uploader/server";
import type { Project } from "./schema";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

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
  { treeId, projectId }: { treeId: Tree["id"]; projectId: Project["id"] },
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

  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });
  if (tree === null) {
    return;
  }
  const props = await parseProps(tree.props);
  const patchedProps = applyPatches(props, patches);

  await prisma.tree.update({
    data: {
      props: serializeProps(patchedProps),
    },
    where: { id: treeId },
  });
};
