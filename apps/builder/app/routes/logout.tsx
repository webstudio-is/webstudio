import { json, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { createDebug } from "~/shared/debug";
import { authenticator } from "~/services/auth.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { getAuthorizationServerOrigin } from "~/shared/router-utils/origins";
import { isBuilder, isDashboard, loginPath } from "~/shared/router-utils";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

const debug = createDebug(import.meta.url);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (isDashboard(request)) {
    // Builder logout can be done through a cross origin fetch request
    preventCrossOriginCookie(request);
  }

  // We are not clearing cross origin cookies here for logout to work through a fetch request
  debug("Logout request received", request.url);

  const authenticatorService = isBuilder(request)
    ? builderAuthenticator
    : authenticator;

  const redirectTo = isBuilder(request)
    ? `${getAuthorizationServerOrigin(request.url)}/${loginPath({})}`
    : loginPath({});

  try {
    await authenticatorService.logout(request, {
      redirectTo,
    });
  } catch (error) {
    if (error instanceof Response) {
      const contentType = request.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        return json(
          { success: error.status < 400 },
          {
            status: error.status < 400 ? 200 : error.status,
          }
        );
      }

      return error;
    }

    throw error;
  }

  throw new Error("Should not reach this point");
};
