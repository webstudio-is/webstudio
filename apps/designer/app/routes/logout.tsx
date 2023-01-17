import type { ActionArgs } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "@webstudio-is/remix";

export default function Logout() {
  return null;
}

export const loader = async ({ request }: ActionArgs) => {
  await authenticator.logout(request, { redirectTo: loginPath({}) });
};
