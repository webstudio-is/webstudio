import { Links, LiveReload, Meta, Scripts } from "@remix-run/react";
import { LoaderFunction, MetaFunction, redirect } from "@remix-run/node";
import { CriticalCss } from "@webstudio-is/sdk";
import { darkTheme } from "~/shared/design-system";

import { authenticator } from "~/services/auth.server";
import config from "~/config";

import { Login, links } from "~/auth/";

export { links };

export const meta: MetaFunction = () => {
  return { title: "Webstudio Login" };
};

const LoginRoute = () => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <CriticalCss />
      </head>
      <body className={darkTheme}>
        <Login />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if (user) {
    return redirect(config.dashboardPath);
  }

  console.log(authenticator.sessionErrorKey);

  return {};
};

export default LoginRoute;
