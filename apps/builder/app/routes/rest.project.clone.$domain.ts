import { redirect, type LoaderArgs } from "@remix-run/node";
import { db as projectDb } from "@webstudio-is/project/index.server";
import type { Project } from "@webstudio-is/project";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { findAuthenticatedUser } from "~/services/auth.server";
import { builderPath, loginPath } from "~/shared/router-utils";
import { createContext } from "~/shared/context.server";

const ensureProject = async (
  {
    domain,
  }: {
    domain: string;
  },
  context: AppContext
): Promise<Project> => {
  return await projectDb.project.cloneByDomain(domain, context);
};

/**
 * Currently this is used to demo the builder from landing page without
 * having to sign up.
 *
 * 1. Set cookie with a random user id if not already set
 * 2. Clone the project by domain if user doesn't have any projects yet
 * 3. Redirect user to the builder with the cloned project
 */
export const loader = async ({ request, params }: LoaderArgs) => {
  if (params.domain === undefined) {
    return { errors: "Domain required" };
  }

  const user = await findAuthenticatedUser(request);

  if (user === null) {
    const url = new URL(request.url);
    return redirect(
      loginPath({
        returnTo: url.pathname,
      })
    );
  }

  const context = await createContext(request);

  try {
    const project = await ensureProject(
      {
        domain: params.domain,
      },
      context
    );

    return redirect(builderPath({ projectId: project.id }));
  } catch (error) {
    if (error instanceof Error) {
      return { errors: error.message };
    }
  }
  return { errors: "Unexpected error" };
};
