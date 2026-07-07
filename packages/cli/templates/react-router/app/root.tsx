/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
  type HeadersFunction,
  type LoaderFunctionArgs,
  Links,
  Meta,
  Outlet,
  useMatches,
} from "react-router";
import { redirectRequest } from "./redirect-url";
// @todo think about how to make __generated__ typeable
// @ts-ignore
import { CustomCode, projectId, lastPublished } from "./__generated__/_index";
// @ts-ignore
import { redirects } from "./__generated__/$resources.redirects";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const redirectResponse = redirectRequest(request, redirects);
  if (redirectResponse !== undefined) {
    return redirectResponse;
  }

  return null;
};

export const headers: HeadersFunction = ({ errorHeaders }) => {
  if (errorHeaders) {
    return errorHeaders;
  }

  return {};
};

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
