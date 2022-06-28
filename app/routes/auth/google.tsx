import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";
import { sentryException } from "~/shared/sentry";
import { ensureUserCookie } from "~/shared/session";
import { AUTH_PROVIDERS } from "~/shared/session/useLoginErrors";

export default function Google() {
  return null;
}

export const loader: LoaderFunction = () => redirect("/login");

export const action: ActionFunction = async ({ request }) => {
  try {
    const { userId } = await ensureUserCookie(request);
    return await authenticator.authenticate("google", request, {
      context: {
        userId,
      },
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
          loginMethod: AUTH_PROVIDERS.LOGIN_GOOGLE,
        },
      });
      return redirect(
        `${config.loginPath}?error=${AUTH_PROVIDERS.LOGIN_GOOGLE}&message=${
          error?.message || ""
        }`
      );
    }
  }
};
