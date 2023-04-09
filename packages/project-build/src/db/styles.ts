import { type Patch, applyPatches } from "immer";
import { type Project, prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import type { Build } from "../types";
import { Styles, StylesList, getStyleDeclKey } from "../schema/styles";

export const parseStyles = (stylesString: string): Styles => {
  const stylesList = StylesList.parse(JSON.parse(stylesString));
  return new Map(stylesList.map((item) => [getStyleDeclKey(item), item]));
};

export const serializeStyles = (stylesMap: Styles) => {
  const stylesList: StylesList = Array.from(stylesMap.values());
  return JSON.stringify(stylesList);
};

export const patchStyles = async (
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

  const styles = parseStyles(build.styles);

  const patchedStyles = Styles.parse(applyPatches(styles, patches));

  await prisma.build.update({
    data: {
      styles: serializeStyles(patchedStyles),
    },
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
};
