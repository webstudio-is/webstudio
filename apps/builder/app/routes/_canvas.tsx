import { Links, Meta, Outlet } from "@remix-run/react";
import { ErrorMessage } from "~/shared/error";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

const Document = (props: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      {props.children}
    </html>
  );
};

export const ErrorBoundary = () => {
  const error = useRouteError();

  console.error({ error });
  const message = isRouteErrorResponse(error)
    ? (error.data.message ?? error.data)
    : error instanceof Error
      ? error.message
      : String(error);

  return (
    <Document>
      <body>
        <ErrorMessage message={message} />
      </body>
    </Document>
  );
};

export default function CanvasLayout() {
  return (
    <Document>
      <Outlet />
    </Document>
  );
}
