import {
  json,
  type LoaderFunctionArgs,
  type TypedResponse,
} from "@remix-run/server-runtime";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { allowedDestinations } from "~/services/destinations.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { createContext } from "~/shared/context.server";
import { parseError } from "~/shared/error/error-parse";
import { isDashboard } from "~/shared/router-utils";

// This loader is only accessible from the dashboard origin
// and is used exclusively for the CLI.
export const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<
  { buildId: string | null } | TypedResponse<{ error: string; message: string }>
> => {
  if (false === isDashboard(request)) {
    throw new Response("Not Found", {
      status: 404,
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
    const buildId = project.latestBuildVirtual?.buildId ?? null;

    return {
      buildId,
    };
  } catch (error) {
    // If a Response is thrown, we're rethrowing it for Remix to handle.
    // https://remix.run/docs/en/v1/api/conventions#throwing-responses-in-loaders
    if (error instanceof Response) {
      throw error;
    }

    console.error(error);

    throw json(parseError(error), {
      status: 500,
    });
  }
};
