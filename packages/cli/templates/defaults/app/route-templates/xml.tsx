import { renderToString } from "react-dom/server";
import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";
import { isLocalResource, loadResources } from "@webstudio-is/sdk/runtime";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import { Page } from "__CLIENT__";
import { getPageMeta, getRemixParams, getResources } from "__SERVER__";
import { assetBaseUrl, imageLoader } from "__CONSTANTS__";
import { sitemap } from "__SITEMAP__";

const customFetch: typeof fetch = (input, init) => {
  if (typeof input !== "string") {
    return fetch(input, init);
  }

  if (isLocalResource(input, "sitemap.xml")) {
    // @todo: dynamic import sitemap ???
    const response = new Response(JSON.stringify(sitemap));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return Promise.resolve(response);
  }

  return fetch(input, init);
};

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

  const resources = await loadResources(
    customFetch,
    getResources({ system }).data
  );
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

  let text = renderToString(
    <ReactSdkContext.Provider
      value={{
        imageLoader,
        assetBaseUrl,
        resources,
      }}
    >
      <Page system={system} />
    </ReactSdkContext.Provider>
  );

  // Xml is wrapped with <svg> to prevent React from hoisting elements like <title>, <meta>, and <link> out of their intended scope during rendering.
  // More details: https://github.com/facebook/react/blob/7c8e5e7ab8bb63de911637892392c5efd8ce1d0f/packages/react-dom-bindings/src/client/ReactFiberConfigDOM.js#L3083
  text = text.replace(/^<svg>/g, "").replace(/<\/svg>$/g, "");

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n${text}`, {
    headers: { "Content-Type": "application/xml" },
  });
};
