import { type Patch, applyPatches } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import { StyleSourceSelections, type Tree } from "@webstudio-is/project-build";
import type { Project } from "./schema";

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

  const styleSourceSelections = StyleSourceSelections.parse(
    JSON.parse(tree.styleSelections)
  );

  const patchedStyleSourceSelections = StyleSourceSelections.parse(
    applyPatches(styleSourceSelections, patches)
  );

  await prisma.tree.update({
    data: {
      styleSelections: JSON.stringify(patchedStyleSourceSelections),
    },
    where: {
      id_projectId: { projectId, id: treeId },
    },
  });
};
