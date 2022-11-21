import { ActionFunction, json } from "@remix-run/node";
import env from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { generateCssText } from "~/shared/css-utils";
import { BuildParams } from "~/shared/router-utils";

export const loader: ActionFunction = async ({ request, params }) => {
  try {
    const projectId = params.projectId ?? undefined;
    const pageId = params.pageId ?? undefined;

    if (projectId === undefined) {
      throw json("Required project id", { status: 404 });
    }

    if (pageId === undefined) {
      throw json("Required page id", { status: 404 });
    }
    const url = new URL(request.url);
    const buildParams: BuildParams = {
      projectId,
      mode: "published",
      pathname: url.pathname,
      pageId,
    };
    const cssText = await generateCssText(buildParams);

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
