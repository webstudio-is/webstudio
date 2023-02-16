import { type ActionArgs, json } from "@remix-run/node";
import { generateCssText } from "@webstudio-is/project";
import { db } from "@webstudio-is/project/server";
import env from "~/env/env.public.server";
import { getBuildParams } from "~/shared/router-utils";
import { sentryException } from "~/shared/sentry";
import { createContext } from "~/shared/context.server";
import { loadCanvasData, loadProductionCanvasData } from "~/shared/db";
import type { Tree } from "@webstudio-is/project-build";

export const loader = async ({ request }: ActionArgs) => {
  try {
    const buildParams = getBuildParams(request);

    const buildEnv = buildParams?.mode === "published" ? "prod" : "dev";

    const context = await createContext(request, buildEnv);

    if (buildParams === undefined) {
      throw json("Required project info", { status: 400 });
    }

    const project = await db.project.loadByParams(buildParams, context);

    if (project === null) {
      throw json("Project not found", { status: 404 });
    }

    if (buildEnv === "dev") {
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
        breakpoints: canvasData.build?.breakpoints,
        styles: canvasData.build?.styles,
        styleSourceSelections: canvasData.tree?.styleSourceSelections,
      });

      return new Response(cssText, {
        headers: {
          "Content-Type": "text/css",
          // We have no way with Remix links to know if CSS has changed (no ?cache-breaker in url)
          // We can add Last-Modified and change Cache-Control: no-cache, but this is only used to publish on localhost.
          // And can be completely omitted for Designer Canvas see https://github.com/webstudio-is/webstudio-builder/issues/1044
          // This is not a problem on the published site, since we know the data at build time.
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
          "Cache-Control": "no-store",
        },
      });
    }

    // For "prod" builds we emulate the published site behaviour, reusing the same data production site uses.
    // https://github.com/webstudio-is/webstudio-builder/issues/929
    // The code below only used on localhost "publish".
    const pagesCanvasData = await loadProductionCanvasData(
      { projectId: project.id },
      context
    );

    if (pagesCanvasData.length === 0) {
      throw json("Project not found or not published yet", { status: 404 });
    }

    const canvasData = pagesCanvasData[0];

    const styleSourceSelections: Tree["styleSourceSelections"] = [];

    for (const pageCanvasData of pagesCanvasData) {
      if (pageCanvasData.tree?.styleSourceSelections) {
        styleSourceSelections.push(
          ...pageCanvasData.tree.styleSourceSelections
        );
      }
    }

    const cssText = generateCssText({
      assets: canvasData.assets,
      breakpoints: canvasData.build?.breakpoints,
      styles: canvasData.build?.styles,
      styleSourceSelections,
    });

    return new Response(cssText, {
      headers: {
        "Content-Type": "text/css",
        // We have no way with Remix links to know if CSS has changed (no ?cache-breaker in url)
        // We can add Last-Modified and change Cache-Control: no-cache, but this is only used to publish on localhost.
        // And can be completely omitted for Designer Canvas see https://github.com/webstudio-is/webstudio-builder/issues/1044
        // This is not a problem on the published site, since we know the data at build time.
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
        "Cache-Control": "no-store",
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
