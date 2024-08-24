import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "@remix-run/react";
import interFont from "@fontsource-variable/inter/index.css?url";
import manropeVariableFont from "@fontsource-variable/manrope/index.css?url";
import robotoMonoFont from "@fontsource/roboto-mono/index.css?url";
import appCss from "../shared/app.css?url";
import type { LinksFunction } from "@remix-run/server-runtime";
import { ErrorMessage } from "~/shared/error/error-message";

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

const Document = (props: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {props.children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
};

export const ErrorBoundary = () => {
  const error = useRouteError();

  const message =
    error == null
      ? "Uknown error"
      : isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText} ${error.data.message ?? error.data}`
        : typeof error === "object" && "message" in error
          ? error.message
          : JSON.stringify(error);

  return (
    <Document>
      <ErrorMessage message={`${message}`} />
    </Document>
  );
};

export default function Layout() {
  return (
    <Document>
      <Outlet />
    </Document>
  );
}
