import { type ActionArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { sentryException } from "~/shared/sentry";
import { AUTH_PROVIDERS } from "~/shared/session";
import { returnToPath } from "~/services/cookie.server";

export default function GH() {
  return null;
}

export const action = async ({ request }: ActionArgs) => {
  const returnTo = await returnToPath(request);

  try {
    return await authenticator.authenticate("github", request, {
      successRedirect: returnTo,
      throwOnError: true,
    });
  } catch (error) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return error;
    }
    if (error instanceof Error) {
      sentryException({
        error,
        extras: {
          loginMethod: AUTH_PROVIDERS.LOGIN_GITHUB,
        },
      });
      return redirect(
        loginPath({
          error: AUTH_PROVIDERS.LOGIN_GITHUB,
          message: error?.message,
          returnTo,
        })
      );
    }
  }
};
