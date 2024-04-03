import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { sentryException } from "~/shared/sentry";
import { AUTH_PROVIDERS } from "~/shared/session";
import { returnToPath } from "~/services/cookie.server";

export default function Google() {
  return null;
}

export const loader = (_args: LoaderFunctionArgs) => redirect("/login");

export const action = async ({ request }: ActionFunctionArgs) => {
  const returnTo = await returnToPath(request);

  try {
    return await authenticator.authenticate("google", request, {
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
          loginMethod: AUTH_PROVIDERS.LOGIN_GOOGLE,
        },
      });
      return redirect(
        loginPath({
          error: AUTH_PROVIDERS.LOGIN_GOOGLE,
          message: error?.message,
          returnTo,
        })
      );
    }
  }
};
