import { redirect, type LoaderFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, isDashboard, loginPath } from "~/shared/router-utils";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { AUTH_PROVIDERS } from "~/shared/session";
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
    await authenticator.authenticate("google", request, {
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
        loginMethod: AUTH_PROVIDERS.LOGIN_GOOGLE,
      },
    });
    return redirect(
      loginPath({
        error: AUTH_PROVIDERS.LOGIN_GOOGLE,
        message,
        returnTo,
      })
    );
  }
};
