import { ActionFunction, redirect } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";
import { LOGIN_ERROR_CODES } from "~/shared/session/useLoginErrors";

export default function Dev() {
  return null;
}

export const action: ActionFunction = async ({ request }) => {
  try {
    return await authenticator.authenticate("dev", request, {
      successRedirect: config.dashboardPath,
      throwOnError: true,
    });
  } catch (error: any) {
    // all redirects are basically errors and in that case we don't want to catch it
    if (error instanceof Response) return error;
    console.log(error);
    return redirect(
      `${config.loginPath}?error=${LOGIN_ERROR_CODES.LOGIN_DEV}&message=${
        error?.message || ""
      }`
    );
  }
};
