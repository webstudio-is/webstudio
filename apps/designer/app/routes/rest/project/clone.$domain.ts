import { type LoaderFunction, redirect } from "@remix-run/node";
import type { User } from "@webstudio-is/prisma-client";
import { db as projectDb } from "@webstudio-is/project/server";
import { type Project } from "@webstudio-is/project";
import * as userDb from "~/shared/db";
import { ensureUserCookie } from "~/shared/session";
import { findAuthenticatedUser } from "~/services/auth.server";
import { designerPath } from "~/shared/router-utils";

const ensureProject = async ({
  userId,
  domain,
}: {
  userId: User["id"];
  domain: string;
}): Promise<Project> => {
  const projects = await projectDb.project.loadManyByUserId(userId);
  if (projects.length !== 0) {
    return projects[0];
  }

  return await projectDb.project.clone(domain, userId);
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
  if (params.domain === undefined) {
    return { errors: "Domain required" };
  }
  const user = await findAuthenticatedUser(request);
  const { headers, userId: generatedUserId } = await ensureUserCookie(request);
  try {
    const userId = await userDb.user.ensureUser({
      userId: user ? user.id : generatedUserId,
    });
    const project = await ensureProject({
      userId,
      domain: params.domain,
    });
    return redirect(designerPath({ projectId: project.id }), { headers });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { errors: error.message };
    }
  }
  return { errors: "Unexpected error" };
};
