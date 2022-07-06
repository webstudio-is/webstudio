import { ActionFunction, redirect } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";
import { sentryException } from "~/shared/sentry";
import { AUTH_PROVIDERS } from "~/shared/session";

export default function GH() {
  return null;
}

export const action: ActionFunction = async ({ request }) => {
  try {
    return await authenticator.authenticate("github", request, {
      successRedirect: config.dashboardPath,
      throwOnError: true,
    });
  } catch (error: unknown) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) return error;
    if (error instanceof Error) {
      sentryException({
        message: error.message,
        extra: {
          loginMethod: AUTH_PROVIDERS.LOGIN_GITHUB,
        },
      });
      return redirect(
        `${config.loginPath}?error=${AUTH_PROVIDERS.LOGIN_GITHUB}&message=${
          error?.message || ""
        }`
      );
    }
  }
};
