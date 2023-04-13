import { type ActionArgs, json } from "@remix-run/node";
import { generateCssText } from "@webstudio-is/react-sdk";
import { db } from "@webstudio-is/project/server";
import { createCssEngine } from "@webstudio-is/css-engine";
import env from "~/env/env.public.server";
import { getBuildParams } from "~/shared/router-utils";
import { sentryException } from "~/shared/sentry";
import { createContext } from "~/shared/context.server";
import { loadCanvasData } from "~/shared/db";
import { helperStyles } from "~/canvas/shared/styles";

export const loader = async ({ request }: ActionArgs) => {
  try {
    const buildParams = getBuildParams(request);

    const context = await createContext(request, "dev");

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
        env: "dev",
        pageIdOrPath:
          "pageId" in buildParams ? buildParams.pageId : buildParams.pagePath,
      },
      context
    );

    if (canvasData === undefined) {
      throw json("Page not found", { status: 404 });
    }

    const cssText = generateCssText(
      {
        assets: canvasData.assets,
        breakpoints: canvasData.build?.breakpoints,
        styles: canvasData.build?.styles,
        styleSourceSelections: canvasData.build?.styleSourceSelections,
      },
      {
        publicPath: env.ASSET_PUBLIC_PATH,
        cdnUrl: env.ASSET_CDN_URL,
      }
    );

    const engine = createCssEngine({ name: "ssr" });
    for (const style of helperStyles) {
      engine.addPlaintextRule(style);
    }

    return new Response(`${cssText}\n${engine.cssText}`, {
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
