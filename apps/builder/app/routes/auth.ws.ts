import type { LoaderFunction } from "@remix-run/node";
import { createDebug } from "~/shared/debug";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { comparePathnames, isBuilder } from "~/shared/router-utils";
import { isRedirectResponse, returnToCookie } from "~/services/cookie.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { setNoStoreToRedirect } from "~/services/no-store-redirect";
import { allowedDestinations } from "~/services/destinations.server";

const debug = createDebug(import.meta.url);

// Endpoint to force user relogin
export const loader: LoaderFunction = async ({ request }) => {
  if (false === isBuilder(request)) {
    debug(`Request url is not the builder URL ${request.url}`);

    return new Response("Only builder URL is allowed", {
      status: 404,
    });
  }

  try {
    preventCrossOriginCookie(request);
    allowedDestinations(request, ["document"]);
    // CSRF is not needed for document only routes

    debug(
      "Authenticate request received, starting authentication and authorization process"
    );

    return await builderAuthenticator.authenticate("ws", request, {
      throwOnError: true,
    });
  } catch (error) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      if (isRedirectResponse(error)) {
        const noStoreResponse = setNoStoreToRedirect(error);
        const response = new Response(noStoreResponse.body, noStoreResponse);

        const url = new URL(request.url);
        let returnTo = url.searchParams.get("returnTo");

        if (returnTo !== null) {
          if (comparePathnames(returnTo, request.url)) {
            // avoid loops
            returnTo = "/";
          }

          // Do not allow absolute URLs
          if (URL.canParse(returnTo)) {
            returnTo = "/";
          }
        }

        const options = returnTo === null ? { maxAge: -1 } : {};

        response.headers.append(
          "Set-Cookie",
          await returnToCookie.serialize(returnTo, options)
        );

        return response;
      }

      return error;
    }

    debug("error", error);

    console.error("error", error);
    throw error;
  }
};
