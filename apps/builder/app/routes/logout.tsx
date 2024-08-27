import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { createDebug } from "~/shared/debug";
import { authenticator } from "~/services/auth.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import {
  getAuthorizationServerOrigin,
  isBuilderUrl,
} from "~/shared/router-utils/origins";

const debug = createDebug(import.meta.url);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  debug("Logout request received", request.url);

  try {
    if (isBuilderUrl(request.url)) {
      debug("Temporary redirect to /tmp/login after logout");
      await builderAuthenticator.logout(request, {
        redirectTo: `${getAuthorizationServerOrigin(request.url)}/tmp/login`,
      });
    } else {
      await authenticator.logout(request, { redirectTo: "/" });
    }
  } catch (error) {
    if (error instanceof Response) {
      const contentType = request.headers.get("Content-Type");

      if (contentType?.includes("application/json")) {
        const headers = new Headers(error.headers);
        headers.set("Content-Type", "application/json");
        return new Response(
          JSON.stringify({
            success: true,
          }),
          {
            headers,
            status: 200,
          }
        );
      }

      return error;
    }

    throw error;
  }

  throw new Error("Should not reach this point");
};
