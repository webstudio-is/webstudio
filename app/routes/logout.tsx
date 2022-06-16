import { ActionFunction } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export default function Login() {
  return "";
}

export const loader: ActionFunction = async ({ request }) => {
  await authenticator.logout(request, { redirectTo: "/login" });
};
