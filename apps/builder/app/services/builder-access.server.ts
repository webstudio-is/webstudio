import { authorizeProject } from "@webstudio-is/trpc-interface/index.server";
import { createPostrestContext } from "~/shared/context.server";

/**
 * Check if a user is authorized to access a project during the Builder authentication process.
 */
export const isUserAuthorizedForProject = async (
  userId: string,
  projectId: string
) => {
  const postgrestContext = createPostrestContext();

  // Only the project owner can access the Builder URL with authentication credentials (session).
  const isProjectOwner = await authorizeProject.checkProjectPermit(
    projectId,
    "own",
    { type: "user", userId },
    postgrestContext.client
  );

  return isProjectOwner;
};
