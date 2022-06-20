import { LoaderFunction, redirect } from "@remix-run/node";

import { authenticator } from "~/services/auth.server";
import config from "~/config";

import { Login, links } from "~/auth/";

export { links };

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if (user) {
    return redirect(config.dashboardPath);
  }

  return {};
};

const LoginRoute = () => {
  return <Login />;
};

export default LoginRoute;
