import { ActionFunction, json } from "@remix-run/node";
import { db } from "@webstudio-is/project/server";
import { loadCanvasData } from "~/shared/db";
import { getBuildParams } from "~/shared/router-utils";
import env from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { createCssEngine } from "@webstudio-is/css-engine";
import { getCssRules } from "~/shared/tree-utils";
import { idAttribute } from "@webstudio-is/react-sdk";

export const loader: ActionFunction = async ({ request }) => {
  try {
    const buildParams = getBuildParams(request);

    if (buildParams === undefined) {
      throw json("Required project info", { status: 404 });
    }

    const project = await db.project.loadByParams(buildParams);

    if (project === null) {
      throw json("Project not found", { status: 404 });
    }

    const canvasData = await loadCanvasData(
      project,
      buildParams.mode === "published" ? "prod" : "dev",
      buildParams.pageId
    );

    if (canvasData === undefined) {
      throw json("Page not found", { status: 404 });
    }

    const engine = createCssEngine();

    for (const breakpoint of canvasData.breakpoints) {
      engine.addMediaRule(breakpoint.id, breakpoint);
    }

    const cssRules = getCssRules(canvasData.tree?.root);
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
