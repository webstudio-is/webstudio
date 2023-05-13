import {
  Links,
  LiveReload,
  Meta,
  Outlet as RemixOutlet,
  Scripts,
} from "@remix-run/react";
import { Env } from "~/shared/env";
import env from "~/env/env.server";
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
      <Env />
      <Scripts />
      {process.env.NODE_ENV === "development" && (
        <LiveReload port={env.BUILD_ORIGIN !== undefined ? 3010 : undefined} />
      )}
    </>
  );
};
