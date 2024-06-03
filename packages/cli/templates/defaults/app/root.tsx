/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Links, Meta, Outlet, useMatches } from "@remix-run/react";
import { CustomCode } from "./__generated__/_index";

const Root = () => {
  // Get language from matches
  const matches = useMatches();

  const lastMatchWithLanguage = [...matches]
    .reverse()
    // @ts-ignore
    .find((match) => match?.data?.pageMeta?.language != null);

  // @ts-ignore
  const lang = lastMatchWithLanguage?.data?.pageMeta?.language ?? "en";

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        <CustomCode />
      </head>
      <Outlet />
    </html>
  );
};

export default Root;
