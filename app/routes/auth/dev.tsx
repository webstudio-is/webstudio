import { ActionFunction } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";

export default function Dev() {
  return null;
}

export const action: ActionFunction = ({ request }) => {
  return authenticator.authenticate("dev", request, {
    successRedirect: config.dashboardPath,
    failureRedirect: config.loginPath,
  });
};
