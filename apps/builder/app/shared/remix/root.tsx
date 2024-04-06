import {
  Links,
  LiveReload,
  Meta,
  Outlet as RemixOutlet,
  Scripts,
} from "@remix-run/react";
import { createHead } from "remix-island";

export const Head = createHead(() => (
  <>
    <Meta />
    <Links />
  </>
));

export const Root = ({ Outlet = RemixOutlet }) => {
  return (
    <>
      <Head />
      <Outlet />
      <Scripts />
      {process.env.NODE_ENV === "development" && <LiveReload />}
    </>
  );
};
