import { Links, Meta, Outlet } from "@remix-run/react";

const Root = () => {
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

export default Root;
