import { useEffect } from "react";
import { Links, Meta, Outlet } from "@remix-run/react";
import { subscribe } from "./web-vitals";

/**
 * Custom root so we can add some custom logic for specific resurces etc like analytics, etc.
 */
const Root = () => {
  useEffect(subscribe, []);

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
