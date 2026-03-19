import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { createPostgrestContext } from "~/shared/context.server";

/**
 * Check if a user is authorized to access a project during the Builder authentication process.
 */
export const isUserAuthorizedForProject = async (
  userId: string,
  projectId: string
) => {
  const postgrestContext = createPostgrestContext();

  // Project owner and workspace members with sufficient permissions
  // can access the Builder URL with authentication credentials (session).
  const isAuthorized = await authorizeProject.checkProjectPermit({
    projectId,
    permit: "edit",
    authInfo: { type: "user", userId },
    postgrestClient: postgrestContext.client,
  });

  return isAuthorized;
};
