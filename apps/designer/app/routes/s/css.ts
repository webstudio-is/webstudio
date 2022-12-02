import { ActionFunction, json } from "@remix-run/node";

import { getBuildParams } from "~/shared/router-utils";
import env from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { generateCssText } from "~/shared/css-utils";

export const loader: ActionFunction = async ({ request }) => {
  try {
    const buildParams = getBuildParams(request);

    if (buildParams === undefined) {
      throw json("Required project info", { status: 400 });
    }

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
