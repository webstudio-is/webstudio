import { LoaderFunction, redirect } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";
import { ensureUserCookie } from "~/shared/session";
import { LOGIN_ERROR_CODES } from "~/shared/session/useLoginErrors";

export const loader: LoaderFunction = async ({ request }) => {
  const { userId } = await ensureUserCookie(request);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const error_description = url.searchParams.get("error_description");
  if (error) {
    return redirect(
      `${config.loginPath}?error=${LOGIN_ERROR_CODES.LOGIN_GITHUB}&message=${
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
