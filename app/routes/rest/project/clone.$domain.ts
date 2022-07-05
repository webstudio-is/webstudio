import { type LoaderFunction, redirect } from "@remix-run/node";
import type { User } from "@webstudio-is/sdk";
import * as db from "~/shared/db";
import { ensureUserCookie } from "~/shared/session";
import config from "~/config";
import type { Project } from "~/shared/db/project.server";
import { authenticator } from "~/services/auth.server";
import { createDemoUser } from "~/shared/db/user.server";

const ensureProject = async ({
  userId,
  domain,
  isDemoUser,
}: {
  userId: User["id"];
  domain: string;
  isDemoUser: boolean;
}): Promise<Project> => {
  if (isDemoUser) {
    await createDemoUser(userId);
  }
  const projects = await db.project.loadManyByUserId(userId);
  if (projects.length !== 0) return projects[0];

  return await db.project.clone(domain, userId);
};

/**
 * Currently this is used to demo the designer from landing page without
 * having to sign up.
 *
 * 1. Set cookie with a random user id if not already set
 * 2. Clone the project by domain if user doesn't have any projects yet
 * 3. Redirect user to the designer with the cloned project
 */
export const loader: LoaderFunction = async ({ request, params }) => {
  if (params.domain === undefined) return { errors: "Domain required" };
  const user = await authenticator.isAuthenticated(request);
  const { headers, userId: generatedUserId } = await ensureUserCookie(request);
  try {
    const project = await ensureProject({
      userId: user ? user.id : generatedUserId,
      domain: params.domain,
      isDemoUser: user?.id === undefined,
    });
    return redirect(`${config.designerPath}/${project?.id}`, { headers });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { errors: error.message };
    }
  }
  return { errors: "Unexpected error" };
};
