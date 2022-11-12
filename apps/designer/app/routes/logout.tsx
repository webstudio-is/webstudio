import { ActionFunction } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";

export default function Logout() {
  return null;
}

export const loader: ActionFunction = async ({ request }) => {
  await authenticator.logout(request, { redirectTo: loginPath({}) });
};
