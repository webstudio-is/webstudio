import { ActionFunction } from "@remix-run/node";
import config from "~/config";
import { authenticator } from "~/services/auth.server";

export default function Logout() {
  return null;
}

export const loader: ActionFunction = async ({ request }) => {
  await authenticator.logout(request, { redirectTo: config.loginPath });
};
