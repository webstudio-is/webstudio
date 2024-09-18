import { type ActionFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { dashboardPath, isDashboard, loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { clearReturnToCookie, returnToPath } from "~/services/cookie.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { redirect, setNoStoreToRedirect } from "~/services/no-store-redirect";

export default function Dev() {
  return null;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  preventCrossOriginCookie(request);

  if (false === isDashboard(request)) {
    throw new Response("Not Found", {
      status: 404,
    });
  }

  const returnTo = (await returnToPath(request)) ?? dashboardPath();

  try {
    await authenticator.authenticate("dev", request, {
      successRedirect: returnTo,
      throwOnError: true,
    });
  } catch (error: unknown) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return setNoStoreToRedirect(await clearReturnToCookie(request, error));
    }

    if (error instanceof Error) {
      console.error("Error authenticating with dev", error);
      return redirect(
        loginPath({
          error: AUTH_PROVIDERS.LOGIN_DEV,
          message: error?.message,
          returnTo,
        })
      );
    }
  }
};
