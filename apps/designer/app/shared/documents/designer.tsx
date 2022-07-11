import { Links, LiveReload, Meta, Outlet, Scripts } from "@remix-run/react";
import { CriticalCss } from "@webstudio-is/sdk";
import { Env } from "~/shared/env";

export const Designer = () => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <CriticalCss />
      </head>
      <body>
        <Outlet />
        <Env />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
};
