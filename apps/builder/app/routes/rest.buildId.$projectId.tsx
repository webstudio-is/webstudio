import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { allowedDestinations } from "~/services/destinations.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { createContext } from "~/shared/context.server";
import { isDashboard } from "~/shared/router-utils";

// This loader is only accessible from the dashboard origin
// and is used exclusively for the CLI.
export const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<{ buildId: string | null }> => {
  if (false === isDashboard(request)) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  preventCrossOriginCookie(request);
  allowedDestinations(request, ["document", "empty"]);
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.

  try {
    const projectId = params.projectId;

    if (projectId === undefined) {
      throw json("Required project id", { status: 400 });
    }

    // @todo Create a context without user authentication information.
    const context = await createContext(request);

    const project = await projectDb.project.loadById(projectId, context);
    const buildId = project.latestBuild?.buildId ?? null;

    return {
      buildId,
    };
  } catch (error) {
    // If a Response is thrown, we're rethrowing it for Remix to handle.
    // https://remix.run/docs/en/v1/api/conventions#throwing-responses-in-loaders
    if (error instanceof Response) {
      throw error;
    }

    console.error({ error });

    // We have no idea what happened, so we'll return a 500 error.
    throw json(error instanceof Error ? error.message : String(error), {
      status: 500,
    });
  }
};
