/* eslint-disable @typescript-eslint/ban-ts-comment */

import { Links, Meta, Outlet, useMatches } from "react-router";
// @todo think about how to make __generated__ typeable
// @ts-ignore
import { CustomCode, projectId, lastPublished } from "./__generated__/_index";

const Root = () => {
  // Get language from matches
  const matches = useMatches();

  const lastMatchWithLanguage = matches.findLast((match) => {
    // @ts-ignore
    const language = match?.data?.pageMeta?.language;
    return language != null;
  });

  // @ts-ignore
  const lang = lastMatchWithLanguage?.data?.pageMeta?.language ?? "en";

  return (
    <html
      lang={lang}
      data-ws-project={projectId}
      data-ws-last-published={lastPublished}
    >
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
