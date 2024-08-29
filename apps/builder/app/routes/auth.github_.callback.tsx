import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, isDashboard, loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  preventCrossOriginCookie(request);

  if (false === isDashboard(request)) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const returnTo = (await returnToPath(request)) ?? dashboardPath();

  try {
    await authenticator.authenticate("github", request, {
      successRedirect: returnTo,
      throwOnError: true,
    });
  } catch (error) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return clearReturnToCookie(request, error);
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
