import { json, type LoaderArgs } from "@remix-run/node";
import { sentryException } from "~/shared/sentry";
import { loadProductionCanvasData } from "~/shared/db";
import type { CanvasData } from "@webstudio-is/project";
import { createContext } from "~/shared/context.server";

type PagesDetails = Array<CanvasData>;

export const loader = async ({
  params,
  request,
}: LoaderArgs): Promise<PagesDetails> => {
  try {
    const projectId = params.projectId ?? undefined;

    if (projectId === undefined) {
      throw json("Required project id", { status: 400 });
    }

    const context = await createContext(request, "prod");

    const pagesCanvasData = await loadProductionCanvasData(
      { projectId },
      context
    );

    return pagesCanvasData;
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
