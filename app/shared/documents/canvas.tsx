import {
  Links,
  LiveReload,
  Meta,
  Outlet as DefaultOutlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { ErrorBoundary, withSentryRouteTracing } from "@sentry/remix";
import { CriticalCss } from "@webstudio-is/sdk";
import { Env } from "~/shared/env";

/**
 * We are using Outlet prop from index layout when user renders site from a subdomain.
 */
const CanvasRoot = ({
  Outlet = DefaultOutlet,
}: {
  Outlet: typeof DefaultOutlet;
}) => {
  return (
    <ErrorBoundary>
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <link rel="icon" href="/favicon.ico" type="image/x-icon" />
          <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
          <Meta />
          <Links />
          <CriticalCss />
        </head>
        <body>
          <Outlet />
          <ScrollRestoration />
          <Env />
          <Scripts />
          {process.env.NODE_ENV === "development" && <LiveReload />}
        </body>
      </html>
    </ErrorBoundary>
  );
};

export const Canvas = withSentryRouteTracing(CanvasRoot);
