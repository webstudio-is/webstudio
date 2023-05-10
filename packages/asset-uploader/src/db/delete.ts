import { prisma, type Project } from "@webstudio-is/prisma-client";
import {
  authorizeProject,
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import type { Asset } from "../schema";

export const deleteFromDb = async (
  props: {
    ids: Array<Asset["id"]>;
    projectId: Project["id"];
  },
  context: AppContext
) => {
  if (props.ids.length === 0) {
    throw new Error("Asset IDs required");
  }

  const canDelete = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "edit" },
    context
  );

  if (canDelete === false) {
    throw new AuthorizationError(
      "You don't have access to create this project assets"
    );
  }

  return await prisma.asset.deleteMany({
    where: { id: { in: props.ids }, projectId: props.projectId },
  });
};
