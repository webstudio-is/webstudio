import { Links, Meta, Outlet } from "@remix-run/react";

export default function CanvasLayout() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <Outlet />
    </html>
  );
}
