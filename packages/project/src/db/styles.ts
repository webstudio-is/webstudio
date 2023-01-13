import { type Patch, applyPatches } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import { Styles } from "@webstudio-is/react-sdk";

const loadStylesByTreeId = async (treeId: string) => {
  const tree = await prisma.tree.findUnique({
    where: { id: treeId },
  });

  if (tree === null) {
    return [];
  }

  return Styles.parse(JSON.parse(tree.styles));
};

export const patch = async (
  { treeId }: { treeId: string },
  patches: Array<Patch>
) => {
  const styles = await loadStylesByTreeId(treeId);
  const patchedStyles = Styles.parse(applyPatches(styles, patches));

  await prisma.tree.update({
    data: {
      styles: JSON.stringify(patchedStyles),
    },
    where: { id: treeId },
  });
};
