import { LoaderFunction, redirect } from "@remix-run/node";
import config from "apps/designer/app/config";
import { authenticator } from "apps/designer/app/services/auth.server";
import {
  ensureUserCookie,
  AUTH_PROVIDERS,
} from "apps/designer/app/shared/session";

export const loader: LoaderFunction = async ({ request }) => {
  const { userId } = await ensureUserCookie(request);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");
  if (error) {
    return redirect(
      `${config.loginPath}?error=${AUTH_PROVIDERS.LOGIN_GITHUB}&message=${
        error_description || error
      }`
    );
  }
  return authenticator.authenticate("github", request, {
    context: {
      userId,
    },
    successRedirect: config.dashboardPath,
    failureRedirect: config.loginPath,
  });
};
