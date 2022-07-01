import { Links, LiveReload, Meta, Outlet, Scripts } from "@remix-run/react";
import { ErrorBoundary, withSentryRouteTracing } from "@sentry/remix";
import { CriticalCss } from "@webstudio-is/sdk";
import { darkTheme } from "~/shared/design-system";
import { Env } from "~/shared/env";

const DesignerRoot = () => {
  return (
    <ErrorBoundary>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <Meta />
          <Links />
          <CriticalCss />
        </head>
        <body className={darkTheme}>
          <Outlet />
          <Env />
          <Scripts />
          {process.env.NODE_ENV === "development" && <LiveReload />}
        </body>
      </html>
    </ErrorBoundary>
  );
};

export const Designer = withSentryRouteTracing(DesignerRoot);
