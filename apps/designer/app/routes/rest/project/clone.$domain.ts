import { type LoaderFunction, redirect } from "@remix-run/node";
import type { User } from "@webstudio-is/sdk";
import * as db from "apps/designer/app/shared/db";
import { ensureUserCookie } from "apps/designer/app/shared/session";
import config from "apps/designer/app/config";
import type { Project } from "apps/designer/app/shared/db/project.server";

const ensureProject = async ({
  userId,
  domain,
}: {
  userId: User["id"];
  domain: string;
}): Promise<Project> => {
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
  const { headers, userId } = await ensureUserCookie(request);
  try {
    const project = await ensureProject({ userId, domain: params.domain });
    return redirect(`${config.designerPath}/${project?.id}`, { headers });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { errors: error.message };
    }
  }
  return { errors: "Unexpected error" };
};
