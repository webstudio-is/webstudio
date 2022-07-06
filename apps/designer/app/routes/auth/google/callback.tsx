import { LoaderFunction } from "@remix-run/node";
import config from "apps/designer/app/config";
import { authenticator } from "apps/designer/app/services/auth.server";
import { ensureUserCookie } from "apps/designer/app/shared/session";

export const loader: LoaderFunction = async ({ request }) => {
  const { userId } = await ensureUserCookie(request);
  return authenticator.authenticate("google", request, {
    successRedirect: config.dashboardPath,
    failureRedirect: config.loginPath,
    context: {
      userId,
    },
  });
};
