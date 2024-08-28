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
    throw new Error("Only Builder can logout at this endpoint");
  }

  if (request.method !== "POST") {
    return json(
      { message: "Method not allowed" },
      {
        status: 405,
        statusText: "Method Not Allowed",
      }
    );
  }

  if (
    false === request.headers.get("Content-Type")?.includes("application/json")
  ) {
    // Enforce preflight request, preflight is checked on allowed origin
    throw new Error("Invalid content type, only application/json is allowed");
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

  throw new Error("Should not reach this point");
};
