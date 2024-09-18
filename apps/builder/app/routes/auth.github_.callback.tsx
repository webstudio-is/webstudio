import { type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, isDashboard, loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect, setNoStoreToRedirect } from "~/services/no-store-redirect";
import { allowedDestinations } from "~/services/destinations.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (false === isDashboard(request)) {
    throw new Response("Not Found", {
      status: 404,
    });
  }
  preventCrossOriginCookie(request);

  allowedDestinations(request, ["document"]);
  // CSRF token checks are not necessary for dashboard-only pages.
  // All requests from the builder or canvas app are safeguarded either by preventCrossOriginCookie for fetch requests
  // or by allowedDestinations for iframe requests.

  const returnTo = (await returnToPath(request)) ?? dashboardPath();

  try {
    await authenticator.authenticate("github", request, {
      successRedirect: returnTo,
      throwOnError: true,
    });
  } catch (error) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return setNoStoreToRedirect(await clearReturnToCookie(request, error));
    }

    const message = error instanceof Error ? error?.message : "unknown error";

    console.error({
      error,
      extras: {
        loginMethod: AUTH_PROVIDERS.LOGIN_GITHUB,
      },
    });

    return redirect(
      loginPath({
        error: AUTH_PROVIDERS.LOGIN_GITHUB,
        message,
        returnTo,
      })
    );
  }
};
