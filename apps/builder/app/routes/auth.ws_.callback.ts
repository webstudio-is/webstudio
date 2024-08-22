import { type LoaderFunction, redirect } from "@remix-run/server-runtime";
import { AuthorizationError } from "remix-auth";
import { createDebug } from "~/shared/debug";
import { isBuilderUrl } from "~/shared/router-utils/origins";
import { returnToPath } from "~/services/cookie.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { OAuth2Error } from "remix-auth-oauth2";
import { builderSessionStorage } from "~/services/builder-session.server";

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

    const returnTo = await returnToPath(request);

    debug("Start exchanging the code for the access token");

    await builderAuthenticator.authenticate("ws", request, {
      throwOnError: true,
      successRedirect: returnTo,
    });
  } catch (error) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return error;
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
