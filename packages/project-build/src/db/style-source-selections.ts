import { type Patch, applyPatches } from "immer";
import { type Project, type Build, prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import {
  StyleSourceSelectionsList,
  StyleSourceSelections,
} from "../schema/style-source-selections";

export const parseStyleSourceSelections = (
  styleSourceSelectionsString: string
): StyleSourceSelections => {
  const styleSourceSelectionsList = StyleSourceSelectionsList.parse(
    JSON.parse(styleSourceSelectionsString)
  );
  return new Map(
    styleSourceSelectionsList.map((item) => [item.instanceId, item])
  );
};

export const serializeStyleSourceSelections = (
  styleSourceSelectionsMap: StyleSourceSelections
) => {
  const styleSourceSelectionsList: StyleSourceSelectionsList = Array.from(
    styleSourceSelectionsMap.values()
  );
  return JSON.stringify(styleSourceSelectionsList);
};

export const patchStyleSourceSelections = async (
  { buildId, projectId }: { buildId: Build["id"]; projectId: Project["id"] },
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

  const build = await prisma.build.findUnique({
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
  if (build === null) {
    return;
  }

  const styleSourceSelections = parseStyleSourceSelections(
    build.styleSourceSelections
  );

  const patchedStyleSourceSelections = StyleSourceSelections.parse(
    applyPatches(styleSourceSelections, patches)
  );

  await prisma.build.update({
    data: {
      styleSourceSelections: serializeStyleSourceSelections(
        patchedStyleSourceSelections
      ),
    },
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
};
