import { Links, Meta, Outlet as DefaultOutlet } from "@remix-run/react";

/**
 * We are using Outlet prop from index layout when user renders project from a subdomain.
 */
export const Root = ({
  Outlet = DefaultOutlet,
}: {
  Outlet: typeof DefaultOutlet;
}) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>

      <Outlet />
    </html>
  );
};
