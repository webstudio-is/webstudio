import { LoaderFunction, redirect } from "@remix-run/node";

import { authenticator } from "~/services/auth.server";
import config from "~/config";

import { Login, links } from "~/auth/";
import { useLoginErrors } from "~/shared/session/useLoginErrors";

export { links };

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if (user) {
    return redirect(config.dashboardPath);
  }

  return { devLogin: process.env.DEV_LOGIN === "true" };
};

const LoginRoute = () => {
  useLoginErrors();
  return <Login />;
};

export default LoginRoute;
