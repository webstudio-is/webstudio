import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { authenticator } from "~/services/auth.server";
import { loginPath } from "~/shared/router-utils";

export default function Logout() {
  return null;
}

export const loader = async ({ request }: ActionFunctionArgs) => {
  await authenticator.logout(request, { redirectTo: loginPath({}) });
};
