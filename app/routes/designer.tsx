import { Links, LiveReload, Meta, Outlet, Scripts } from "remix";
import type { MetaFunction } from "remix";
import { CriticalCss } from "@webstudio-is/sdk";
import { darkTheme, getCssText } from "~/shared/design-system";

export const meta: MetaFunction = () => {
  return { title: "Webstudio" };
};

export default () => {
  const root = (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <CriticalCss />
      </head>
      <body className={darkTheme}>
        <Outlet />
        <Scripts />
        {process.env.NODE_ENV === "development" && <LiveReload />}
      </body>
    </html>
  );

  return root;
};
