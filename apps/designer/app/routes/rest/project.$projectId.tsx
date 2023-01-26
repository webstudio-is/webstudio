import { json, type LoaderArgs } from "@remix-run/node";
import env from "~/env.server";
import { db } from "@webstudio-is/project/server";
import { sentryException } from "~/shared/sentry";
import { loadCanvasData } from "~/shared/db";
import type { CanvasData } from "@webstudio-is/project";
import { createContext } from "~/shared/context.server";

type PagesDetails = Array<CanvasData | undefined>;

export const loader = async ({ params, request }: LoaderArgs) => {
  try {
    const projectId = params.projectId ?? undefined;
    const pages: PagesDetails = [];

    if (projectId === undefined) {
      throw json("Required project id", { status: 400 });
    }

    const context = await createContext(request);

    const prodBuild = await db.build.loadByProjectId(projectId, "prod");
    if (prodBuild === undefined) {
      throw json(
        `Project ${projectId} not found or not published yet. Please contact us to get help.`,
        { status: 500 }
      );
    }
    const {
      pages: { homePage, pages: otherPages },
    } = prodBuild;
    const project = await db.project.loadByParams({ projectId }, context);
    if (project === null) {
      throw json("Project not found", { status: 404 });
    }
    const canvasData = await loadCanvasData(project, "prod", homePage.path);

    pages.push(canvasData);
    if (otherPages.length > 0) {
      for (const page of otherPages) {
        const canvasData = await loadCanvasData(project, "prod", page.path);
        pages.push(canvasData);
      }
    }

    return pages;
  } catch (error) {
    // If a Response is thrown, we're rethrowing it for Remix to handle.
    // https://remix.run/docs/en/v1/api/conventions#throwing-responses-in-loaders
    if (error instanceof Response) {
      throw error;
    }

    sentryException({ error });
    return {
      errors: error instanceof Error ? error.message : String(error),
      env,
    };
  }
};
