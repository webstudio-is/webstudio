import { Links, LiveReload, Meta, Outlet, Scripts } from "@remix-run/react";
import { Env } from "~/shared/env";
import { useThemeProps } from "~/shared/theme";
import { CRITICAL_CSS_MARKER } from "./constants";

export const Root = () => {
  const themeProps = useThemeProps();
  return (
    <html lang="en" {...themeProps}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        {typeof document === "undefined" ? CRITICAL_CSS_MARKER : null}
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
