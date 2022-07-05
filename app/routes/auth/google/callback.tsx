import { LoaderFunction } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";

export const loader: LoaderFunction = async ({ request }) => {
  return authenticator.authenticate("google", request, {
    successRedirect: config.dashboardPath,
    failureRedirect: config.loginPath,
  });
};
