/* eslint-disable camelcase */
import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";
import { ReactSdkContext } from "@webstudio-is/react-sdk";
import { Page } from "../__generated__/[sitemap.xml]._index";
import {
  loadResources,
  getPageMeta,
  getRemixParams,
} from "../__generated__/[sitemap.xml]._index.server";

import { assetBaseUrl, imageBaseUrl, imageLoader } from "../constants.mjs";
import { renderToString } from "react-dom/server";

export const loader = async (arg: LoaderFunctionArgs) => {
  const url = new URL(arg.request.url);
  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";
  url.host = host;
  url.protocol = "https";

  const params = getRemixParams(arg.params);

  const system = {
    params,
    search: Object.fromEntries(url.searchParams),
    origin: url.origin,
  };

  const resources = await loadResources({ system });
  const pageMeta = getPageMeta({ system, resources });

  if (pageMeta.redirect) {
    const status =
      pageMeta.status === 301 || pageMeta.status === 302
        ? pageMeta.status
        : 302;
    return redirect(pageMeta.redirect, status);
  }

  // typecheck
  arg.context.EXCLUDE_FROM_SEARCH satisfies boolean;

  const text = renderToString(
    <ReactSdkContext.Provider
      value={{
        imageLoader,
        assetBaseUrl,
        imageBaseUrl,
        resources,
      }}
    >
      <Page system={system} />
    </ReactSdkContext.Provider>
  );

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${text}`, {
    headers: { "Content-Type": "application/xml" },
  });
};
