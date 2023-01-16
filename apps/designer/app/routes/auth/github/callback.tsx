import { type LoaderArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { returnToPath } from "~/services/cookie.server";

export const loader = async ({ request }: LoaderArgs) => {
  const returnTo = await returnToPath(request);
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  if (error) {
    return redirect(
      loginPath({
        error: AUTH_PROVIDERS.LOGIN_GITHUB,
        message: errorDescription || error,
        returnTo,
      })
    );
  }
  return authenticator.authenticate("github", request, {
    successRedirect: returnTo,
    failureRedirect: loginPath({}),
  });
};
