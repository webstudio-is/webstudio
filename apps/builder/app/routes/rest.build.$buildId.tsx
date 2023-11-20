import { json, type LoaderArgs } from "@remix-run/node";
import type { Data } from "@webstudio-is/http-client";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { sentryException } from "~/shared/sentry";
import { loadProductionCanvasData } from "~/shared/db";
import { createContext } from "~/shared/context.server";
import { getUserById, type User } from "~/shared/db/user.server";

export const loader = async ({
  params,
  request,
}: LoaderArgs): Promise<
  Data & { user: { email: User["email"] } | undefined } & {
    projectDomain: string;
  }
> => {
  try {
    const buildId = params.buildId;

    if (buildId === undefined) {
      throw json("Required build id", { status: 400 });
    }

    const context = await createContext(request);

    const pagesCanvasData = await loadProductionCanvasData(buildId, context);

    const project = await projectDb.project.loadById(
      pagesCanvasData.build.projectId,
      context
    );

    const user =
      project === null || project.userId === null
        ? undefined
        : await getUserById(project.userId);

    return {
      ...pagesCanvasData,
      user: user ? { email: user.email } : undefined,
      projectDomain: project.domain,
    };
  } catch (error) {
    // If a Response is thrown, we're rethrowing it for Remix to handle.
    // https://remix.run/docs/en/v1/api/conventions#throwing-responses-in-loaders
    if (error instanceof Response) {
      throw error;
    }

    sentryException({ error });

    // We have no idea what happened, so we'll return a 500 error.
    throw json(error instanceof Error ? error.message : String(error), {
      status: 500,
    });
  }
};
