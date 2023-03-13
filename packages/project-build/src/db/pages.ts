import { applyPatches, type Patch } from "immer";
import { type Project, type Build, prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import { Pages } from "../schema/pages";

export const patchPages = async (
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
  const pages = Pages.parse(JSON.parse(build.pages));
  const patchedPages = Pages.parse(applyPatches(pages, patches));

  await prisma.build.update({
    data: {
      pages: JSON.stringify(patchedPages),
    },
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
};
