import {
  Links,
  LiveReload,
  Meta,
  Outlet as DefaultOutlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { CriticalCss } from "@webstudio-is/react-sdk";
import { Env } from "~/shared/env";

/**
 * We are using Outlet prop from index layout when user renders site from a subdomain.
 */
export const Canvas = ({
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
      <Outlet />
      {
        // @todo may need to figure out how to put in script tags inside the body
        // body is rendered by outlet because its part of the user tree
      }
      <ScrollRestoration />
      <Env />
      <Scripts />
      {process.env.NODE_ENV === "development" && <LiveReload />}
    </html>
  );
};
