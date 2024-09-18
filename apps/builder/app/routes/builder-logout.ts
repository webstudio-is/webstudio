import { json, type ActionFunctionArgs } from "@remix-run/server-runtime";
import { createDebug } from "~/shared/debug";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { getAuthorizationServerOrigin } from "~/shared/router-utils/origins";
import { isBuilder, loginPath } from "~/shared/router-utils";
import { isRedirectResponse } from "~/services/cookie.server";

const debug = createDebug(import.meta.url);

export const action = async ({ request }: ActionFunctionArgs) => {
  // IMPORTANT: This route allows cross-origin cookies to enable dashboard logout from builders.
  // Enforcing preflight by checking Content-Type to be application/json.
  // At the SaaS proxy side, only the allowed "access-control-allow-origin" header is set for OPTIONS requests.

  if (false === isBuilder(request)) {
    throw new Response("Not found", {
      status: 404,
    });
  }

  if (request.method !== "POST") {
    return json(
      { message: "Method not allowed" },
      {
        status: 405,
      }
    );
  }

  if (request.headers.get("sec-fetch-site") === "same-origin") {
    // To prevent logout initiated from the builder iframe

    throw new Response("Only cross-origin requests are allowed", {
      status: 403,
    });
  }

  if (
    false === request.headers.get("Content-Type")?.includes("application/json")
  ) {
    // Enforce preflight request, preflight is checked on allowed origin

    throw new Response(
      "Invalid content type, only application/json is allowed",
      {
        status: 415,
      }
    );
  }

  const redirectTo = `${getAuthorizationServerOrigin(request.url)}${loginPath({})}`;

  try {
    debug("Logging out");

    await builderAuthenticator.logout(request, {
      redirectTo,
    });
  } catch (error) {
    if (error instanceof Response) {
      if (isRedirectResponse(error)) {
        return new Response(null, {
          status: 204,
          headers: error.headers,
        });
      }

      return error;
    }

    console.error(error);
    throw error;
  }

  throw new Response("Should not reach this point", {
    status: 500,
  });
};
