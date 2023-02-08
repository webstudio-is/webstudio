import { type Patch, applyPatches } from "immer";
import { prisma } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/server";
import { StyleSourcesList, StyleSources } from "@webstudio-is/project-build";
import type { Build, Project } from "../shared/schema";

export const parseStyleSources = (styleSourceString: string): StyleSources => {
  const styleSourcesList = StyleSourcesList.parse(
    JSON.parse(styleSourceString)
  );
  return new Map(styleSourcesList.map((item) => [item.id, item]));
};

export const serializeStyleSources = (styleSourcesMap: StyleSources) => {
  const styleSourcesList: StyleSourcesList = Array.from(
    styleSourcesMap.values()
  );
  return JSON.stringify(styleSourcesList);
};

export const patch = async (
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

  const styleSources = parseStyleSources(build.styleSources);

  const patchedStyleSources = StyleSources.parse(
    applyPatches(styleSources, patches)
  );

  await prisma.build.update({
    data: {
      styleSources: serializeStyleSources(patchedStyleSources),
    },
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });
};
