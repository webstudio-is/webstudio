import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import interFont from "@fontsource-variable/inter/index.css?url";
import manropeVariableFont from "@fontsource-variable/manrope/index.css?url";
import robotoMonoFont from "@fontsource/roboto-mono/index.css?url";
import appCss from "../shared/app.css?url";
import type { LinksFunction } from "@remix-run/server-runtime";

export const links: LinksFunction = () => {
  // `links` returns an array of objects whose
  // properties map to the `<link />` component props
  return [
    { rel: "stylesheet", href: interFont },
    { rel: "stylesheet", href: manropeVariableFont },
    { rel: "stylesheet", href: robotoMonoFont },
    { rel: "stylesheet", href: appCss },
  ];
};

export default function Layout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
