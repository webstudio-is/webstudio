import { type ActionArgs, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";
import { AUTH_PROVIDERS } from "~/shared/session";
import { returnToPath } from "~/services/cookie.server";

export default function Dev() {
  return null;
}

export const action = async ({ request }: ActionArgs) => {
  const returnTo = await returnToPath(request);

  try {
    return await authenticator.authenticate("dev", request, {
      successRedirect: returnTo,
      throwOnError: true,
    });
  } catch (error: unknown) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) {
      return error;
    }
    if (error instanceof Error) {
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
