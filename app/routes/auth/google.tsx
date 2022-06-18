import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";
import { ensureUserCookie } from "~/shared/session";

export const loader: LoaderFunction = () => redirect("/login");

export const action: ActionFunction = async ({ request }) => {
  const { userId } = await ensureUserCookie(request);
  return authenticator.authenticate("google", request, {
    context: {
      userId,
    },
  });
};
