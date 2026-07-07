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

  // Any user with at least view access (viewers, editors, builders,
  // administrators, or owner) can open the builder. The UI and server
  // enforce per-action permissions once inside.
  const isAuthorized = await authorizeProject.checkProjectPermit({
    projectId,
    permit: "view",
    authInfo: { type: "user", userId },
    postgrestClient: postgrestContext.client,
  });

  return isAuthorized;
};
