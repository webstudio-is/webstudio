import type { LoaderFunction } from "@remix-run/node";
import { createDebug } from "~/shared/debug";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { isBuilderUrl } from "~/shared/router-utils/origins";

const debug = createDebug(import.meta.url);

export const loader: LoaderFunction = async ({ request }) => {
  try {
    if (false === isBuilderUrl(request.url)) {
      debug(`Request url is not the builder URL ${request.url}`);

      return new Response(null, {
        status: 404,
        statusText: "Only builder URL is allowed",
      });
    }

    debug(
      "Authenticate request received, starting authentication and authorization process"
    );

    return await builderAuthenticator.authenticate("ws", request, {
      throwOnError: true,
    });
  } catch (error) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return error;
    }

    debug("error", error);

    console.error("error", error);
    throw error;
  }
};
