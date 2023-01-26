import { type ActionArgs, json } from "@remix-run/node";

import { getBuildParams } from "~/shared/router-utils";
import env from "~/env.server";
import { sentryException } from "~/shared/sentry";
import { generateCssText } from "~/shared/css-utils";
import { createContext } from "~/shared/context.server";

export const loader = async ({ request }: ActionArgs) => {
  try {
    const buildParams = getBuildParams(request);
    const context = await createContext(request);

    if (buildParams === undefined) {
      throw json("Required project info", { status: 400 });
    }

    const cssText = await generateCssText(buildParams, context);

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
