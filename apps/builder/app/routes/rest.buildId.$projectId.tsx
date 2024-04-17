import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { db as projectDb } from "@webstudio-is/project/index.server";
import { createContext } from "~/shared/context.server";

export const loader = async ({
  params,
  request,
}: LoaderFunctionArgs): Promise<{ buildId: string | null }> => {
  try {
    const projectId = params.projectId;

    if (projectId === undefined) {
      throw json("Required project id", { status: 400 });
    }

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
