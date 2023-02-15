import { type Tree, Props, PropsList } from "@webstudio-is/project-build";
import { applyPatches, type Patch } from "immer";
import { type Project, prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";

export const parseProps = (propsString: string): Props => {
  const propsList = PropsList.parse(JSON.parse(propsString));
  return new Map(propsList.map((prop) => [prop.id, prop]));
};

export const serializeProps = (props: Props) => {
  const propsList: PropsList = Array.from(props.values());
  return JSON.stringify(propsList);
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
    where: {
      id_projectId: { projectId, id: treeId },
    },
  });
  if (tree === null) {
    return;
  }
  const props = parseProps(tree.props);
  const patchedProps = Props.parse(applyPatches(props, patches));

  await prisma.tree.update({
    data: {
      props: serializeProps(patchedProps),
    },
    where: {
      id_projectId: { projectId, id: treeId },
    },
  });
};
