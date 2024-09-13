import { Links, Meta, Outlet } from "@remix-run/react";
import { ErrorBoundary as ErrorBoundaryComponent } from "~/shared/error/error-boundary";

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
  return (
    <Document>
      <ErrorBoundaryComponent />
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
