import {
  Links,
  LiveReload,
  Meta,
  Outlet as DefaultOutlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { type MetaFunction } from "@remix-run/node";
import { CriticalCss } from "@webstudio-is/sdk";

export const meta: MetaFunction = () => {
  return { title: "Webstudio canvas" };
};

/**
 * We are using Outlet prop from index layout when user renders site from a subdomain.
 */
const Document = ({
  Outlet = DefaultOutlet,
}: {
  Outlet: typeof DefaultOutlet;
}) => {
  return (
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
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );
};

export default Document;
