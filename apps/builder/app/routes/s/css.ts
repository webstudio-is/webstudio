import { type ActionArgs, json } from "@remix-run/node";
import { generateCssText } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/server";
import env from "~/env/env.public.server";
import { getBuildParams } from "~/shared/router-utils";
import { sentryException } from "~/shared/sentry";
import { createContext } from "~/shared/context.server";
import { loadCanvasData } from "~/shared/db";

export const loader = async ({ request }: ActionArgs) => {
  try {
    const buildParams = getBuildParams(request);
    const context = await createContext(request);

    if (buildParams === undefined) {
      throw json("Required project info", { status: 400 });
    }

    const project = await db.project.loadByParams(buildParams, context);
    if (project === null) {
      throw json("Project not found", { status: 404 });
    }

    const canvasData = await loadCanvasData(
      {
        project,
        env: buildParams.mode === "published" ? "prod" : "dev",
        pageIdOrPath:
          "pageId" in buildParams ? buildParams.pageId : buildParams.pagePath,
      },
      context
    );
    if (canvasData === undefined) {
      throw json("Page not found", { status: 404 });
    }

    const cssText = generateCssText({
      assets: canvasData.assets,
      build: canvasData.build ?? undefined,
      tree: canvasData.tree ?? undefined,
    });

    return new Response(cssText, {
      headers: {
        "Content-Type": "text/css",
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
        "Cache-Control": "public, max-age=31536000, immutable",
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
