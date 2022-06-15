import { ActionFunction } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";

export const action: ActionFunction = ({ request }) => {
  return authenticator.authenticate("github", request, {
    successRedirect: config.dashboardPath,
    failureRedirect: config.loginPath,
  });
};
