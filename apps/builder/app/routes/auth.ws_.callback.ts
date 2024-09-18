import { type LoaderFunction } from "@remix-run/server-runtime";
import { AuthorizationError } from "remix-auth";
import { createDebug } from "~/shared/debug";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { OAuth2Error } from "remix-auth-oauth2";
import { builderSessionStorage } from "~/services/builder-session.server";
import { builderPath, isBuilder } from "~/shared/router-utils";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect, setNoStoreToRedirect } from "~/services/no-store-redirect";
import { allowedDestinations } from "~/services/destinations.server";

const debug = createDebug(import.meta.url);

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

    const returnTo = (await returnToPath(request)) ?? builderPath({});

    debug("Start exchanging the code for the access token");

    await builderAuthenticator.authenticate("ws", request, {
      throwOnError: true,
      successRedirect: returnTo,
    });
  } catch (error) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      debug("Response with Cookie");

      const session = await builderSessionStorage.getSession(
        error.headers.get("Set-Cookie")
      );

      // Cleanup due to a bug in remix-auth-oauth2: https://github.com/sergiodxa/remix-auth-oauth2/issues/122
      const sessionStateKey = "oauth2:state";
      const sessionCodeVerifierKey = "oauth2:codeVerifier";
      session.unset(sessionStateKey);
      session.unset(sessionCodeVerifierKey);

      const response = new Response(error.body, error);
      // Use set instead of append to overwrite the cookie
      response.headers.set(
        "Set-Cookie",
        await builderSessionStorage.commitSession(session)
      );

      return setNoStoreToRedirect(await clearReturnToCookie(request, response));
    }

    if (error instanceof AuthorizationError) {
      debug("Authorization error", error.message, error.cause?.message);

      const sessionError = {
        message: error.message,
        description: "",
      };

      if (error.cause instanceof OAuth2Error) {
        debug(
          "OAuth2Error error",
          error.cause?.message,
          error.cause?.description
        );
        sessionError.description = error.cause.description ?? "";
      }

      const session = await builderSessionStorage.getSession(
        request.headers.get("Cookie")
      );
      session.flash(builderAuthenticator.sessionErrorKey, sessionError);

      throw redirect("/error", {
        headers: {
          "Set-Cookie": await builderSessionStorage.commitSession(session),
        },
      });
    }

    debug("error", error);
    console.error("error", error);
    throw error;
  }
};
