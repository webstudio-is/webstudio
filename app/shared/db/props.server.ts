import { type Project, type Tree, type AllUserProps } from "@webstudio-is/sdk";
import { applyPatches, type Patch } from "immer";
import { prisma } from "./prisma.server";
import { ParsedProject } from "./project.server";

export const loadByProject = async (
  project: ParsedProject | null,
  env: "production" | "development" = "development"
) => {
  if (project === null) {
    throw new Error("Project required");
  }

  const treeId = env === "production" ? project.prodTreeId : project.devTreeId;

  if (treeId === null) {
    throw new Error("Site needs to be published, production tree ID is null.");
  }

  return loadByTreeId(treeId);
};

export const loadByTreeId = async (treeId: Tree["id"]) => {
  const instancePropsEntries = await prisma.instanceProps.findMany({
    where: { treeId },
  });

  return instancePropsEntries.map((tree) => ({
    ...tree,
    props: JSON.parse(tree.props),
  }));
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
  { treeId }: { treeId: Tree["id"]; projectId: Project["id"] },
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
    Object.values(nextProps).map(({ id, instanceId, treeId, props }) =>
      prisma.instanceProps.upsert({
        where: { id: id },
        create: { id: id, instanceId, treeId, props: JSON.stringify(props) },
        update: {
          props: JSON.stringify(props),
        },
      })
    )
  );
};
