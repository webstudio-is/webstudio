import { ActionFunction, json } from "@remix-run/node";
import { db } from "@webstudio-is/project/server";
import { utils } from "@webstudio-is/project";
import { loadCanvasData } from "~/shared/db";
import env from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { createCssEngine } from "@webstudio-is/css-engine";
import { idAttribute } from "@webstudio-is/react-sdk";
import { addGlobalRules } from "~/canvas/shared/styles";

export const loader: ActionFunction = async ({ params }) => {
  try {
    const projectId = params.projectId ?? undefined;
    const pageId = params.pageId ?? undefined;
    console.log({ projectId, pageId });
    if (projectId === undefined) {
      throw json("Required project id", { status: 404 });
    }

    if (pageId === undefined) {
      throw json("Required page id", { status: 404 });
    }

    const project = await db.project.loadByParams({ projectId });

    if (project === null) {
      throw json("Project not found", { status: 404 });
    }

    const canvasData = await loadCanvasData(project, "prod", pageId);

    if (canvasData === undefined) {
      throw json("Page not found", { status: 404 });
    }

    const engine = createCssEngine();

    addGlobalRules(engine, canvasData);

    for (const breakpoint of canvasData.breakpoints) {
      engine.addMediaRule(breakpoint.id, breakpoint);
    }

    const cssRules = utils.tree.getCssRules(canvasData.tree?.root);
    for (const [instanceId, cssRule] of cssRules) {
      engine.addStyleRule(`[${idAttribute}="${instanceId}"]`, cssRule);
    }
    const { cssText } = engine;

    return new Response(cssText, {
      headers: {
        "Content-Type": "text/css",
      },
    });
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
