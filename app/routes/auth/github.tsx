import { ActionFunction } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";
import { ensureUserCookie } from "~/shared/session";

export const action: ActionFunction = async ({ request }) => {
  const { userId } = await ensureUserCookie(request);
  return authenticator.authenticate("github", request, {
    context: {
      userId,
    },
    successRedirect: config.dashboardPath,
    failureRedirect: config.loginPath,
  });
};
