import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, isDashboard, loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";

export default function Google() {
  return null;
}

export const loader = (_args: LoaderFunctionArgs) => redirect("/login");

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);

  if (false === isDashboard(request)) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  const returnTo = (await returnToPath(request)) ?? dashboardPath();

  try {
    return await authenticator.authenticate("google", request, {
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
        message: message,
        returnTo,
      })
    );
  }
};
