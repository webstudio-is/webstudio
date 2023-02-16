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
          // We have no way with Remix links to know if the CSS has changed (no ?cache-breaker in url)
          // we can add Last-Modified and change on Cache-Control: no-cache but this is used only for localhost publish
          // And can be fully omitted for the Designer Canvas. (_Not an issue on SaaS as we know data at the build time_)
          // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
          "Cache-Control": "no-store",
        },
      });
    }

    // For "prod" builds we emulate the SaaS behaviour, reusing the same data SaaS uses.
    // https://github.com/webstudio-is/webstudio-builder/issues/929
    // This is used on localhost "publish".
    const pages = await loadProductionCanvasData(
      { projectId: project.id },
      context
    );

    if (pages.length === 0) {
      throw json("Project not found or not published yet", { status: 404 });
    }

    const canvasData = pages[0];

    const styleSourceSelections: Tree["styleSourceSelections"] = [];

    for (const page of pages) {
      if (page.tree?.styleSourceSelections) {
        styleSourceSelections.push(...page.tree.styleSourceSelections);
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
        // We have no way with Remix links to know if the CSS has changed (no ?cache-breaker in url)
        // we can add Last-Modified and change on Cache-Control: no-cache but this is used only for localhost publish
        // And can be fully omitted for the Designer Canvas. (_Not an issue on SaaS as we know data at the build time_)
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
