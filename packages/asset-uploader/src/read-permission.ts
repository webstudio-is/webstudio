import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";

export const assertAssetReadPermission = async (
  projectId: string,
  context: AppContext,
  skipPermissionsCheck: boolean
) => {
  if (
    skipPermissionsCheck === false &&
    (await authorizeProject.hasProjectPermit(
      { projectId, permit: "view" },
      context
    )) === false
  ) {
    throw new AuthorizationError(
      "You don't have access to this project's assets"
    );
  }
};
