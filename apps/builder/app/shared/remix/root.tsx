import { Links, Meta, Outlet as RemixOutlet, Scripts } from "@remix-run/react";
import { createHead } from "remix-island";

/**
 * use remix-island to fix hydration errors when extensions
 * change layout, see https://github.com/webstudio-is/webstudio/pull/1621
 */
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
    </>
  );
};
