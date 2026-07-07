import { type ComponentProps, memo, useMemo } from "react";
import {
  type MetaFunction,
  type LinksFunction,
  type LinkDescriptor,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type HeadersFunction,
  data,
  redirect,
  useLoaderData,
} from "react-router";
import {
  isLocalResource,
  loadResource,
  loadResources,
  formIdFieldName,
  formBotFieldName,
  cachedFetch,
} from "@webstudio-is/sdk/runtime";
import { authenticateRequest } from "@webstudio-is/wsauth";
import {
  ReactSdkContext,
  PageSettingsMeta,
  PageSettingsTitle,
} from "@webstudio-is/react-sdk/runtime";
import {
  projectId,
  projectDomain,
  Page,
  siteName,
  favIconAsset,
  pageFontAssets,
  pageBackgroundImageAssets,
  breakpoints,
} from "../__generated__/[another-page]._index";
import {
  getResources,
  getPageMeta,
  getRemixParams,
  contactEmail,
} from "../__generated__/[another-page]._index.server";
import * as constants from "../constants.mjs";
import css from "../__generated__/index.css?url";
import { sitemap } from "../__generated__/$resources.sitemap.xml";
import { assets } from "../__generated__/$resources.assets";
import { authRoutes } from "../__generated__/$resources.wsauth.server";

const authenticateProductionRequest = (request: Request) => {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  const requestHost = host.split(":")[0];
  if (
    projectDomain !== undefined &&
    (requestHost === projectDomain ||
      requestHost.startsWith(`${projectDomain}.`))
  ) {
    return;
  }

  return authenticateRequest(request, authRoutes);
};

const customFetch: typeof fetch = (input, init) => {
  if (typeof input !== "string") {
    return cachedFetch(projectId, input, init);
  }

  if (isLocalResource(input, "sitemap.xml")) {
    // @todo: dynamic import sitemap ???
    const response = new Response(JSON.stringify(sitemap));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return Promise.resolve(response);
  }

  if (isLocalResource(input, "current-date")) {
    const now = new Date();
    // Normalize to midnight UTC to prevent hydration mismatches
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const data = {
      iso: startOfDay.toISOString(),
      year: startOfDay.getUTCFullYear(),
      month: startOfDay.getUTCMonth() + 1, // 1-12 instead of 0-11
      day: startOfDay.getUTCDate(),
      timestamp: startOfDay.getTime(),
    };
    const response = new Response(JSON.stringify(data));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return Promise.resolve(response);
  }

  if (isLocalResource(input, "assets")) {
    const response = new Response(JSON.stringify(assets));
    response.headers.set("content-type", "application/json; charset=utf-8");
    return Promise.resolve(response);
  }

  return cachedFetch(projectId, input, init);
};

export const loader = async (arg: LoaderFunctionArgs) => {
  const authRoute = authenticateProductionRequest(arg.request);

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
    pathname: url.pathname,
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
    throw redirect(pageMeta.redirect, status);
  }

  // typecheck
  arg.context.EXCLUDE_FROM_SEARCH satisfies boolean;

  if (arg.context.EXCLUDE_FROM_SEARCH) {
    pageMeta.excludePageFromSearch = arg.context.EXCLUDE_FROM_SEARCH;
  }

  return data(
    {
      host,
      url: url.href,
      system,
      resources,
      pageMeta,
    },
    // No way for current information to change, so add cache for 10 minutes
    // In case of CRM Data, this should be set to 0
    {
      status: pageMeta.status,
      headers: {
        "Cache-Control":
          authRoute === undefined ? "public, max-age=600" : "private, no-store",
      },
    }
  );
};

export const headers: HeadersFunction = ({ errorHeaders }) => {
  if (errorHeaders) {
    return errorHeaders;
  }

  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
  };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const metas: ReturnType<MetaFunction> = [];
  if (data === undefined) {
    return metas;
  }

  const origin = `https://${data.host}`;

  if (siteName) {
    metas.push({
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: origin,
      },
    });
  }

  return metas;
};

export const links: LinksFunction = () => {
  const result: LinkDescriptor[] = [];

  result.push({
    rel: "stylesheet",
    href: css,
  });

  if (favIconAsset) {
    result.push({
      rel: "icon",
      href: constants.imageLoader({
        src: `${constants.assetBaseUrl}${favIconAsset}`,
        // width,height must be multiple of 48 https://developers.google.com/search/docs/appearance/favicon-in-search
        width: 144,
        height: 144,
        fit: "pad",
        quality: 100,
        format: "auto",
      }),
      type: undefined,
    });
  }

  for (const asset of pageFontAssets) {
    result.push({
      rel: "preload",
      href: `${constants.assetBaseUrl}${asset}`,
      as: "font",
      crossOrigin: "anonymous",
    });
  }

  for (const backgroundImageAsset of pageBackgroundImageAssets) {
    result.push({
      rel: "preload",
      href: `${constants.assetBaseUrl}${backgroundImageAsset}`,
      as: "image",
    });
  }

  return result;
};

const getRequestHost = (request: Request): string =>
  request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

export const action = async ({
  request,
  context,
}: ActionFunctionArgs): Promise<
  { success: true } | { success: false; errors: string[] }
> => {
  authenticateProductionRequest(request);

  try {
    const url = new URL(request.url);
    url.host = getRequestHost(request);

    const formData = await request.formData();

    const system = {
      params: {},
      search: {},
      origin: url.origin,
      pathname: url.pathname,
    };

    const resourceName = formData.get(formIdFieldName);
    let resource =
      typeof resourceName === "string"
        ? getResources({ system }).action.get(resourceName)
        : undefined;

    const formBotValue = formData.get(formBotFieldName);

    if (formBotValue == null || typeof formBotValue !== "string") {
      throw new Error("Form bot field not found");
    }

    // Skip timestamp validation for Brave browser
    // Brave Shields blocks matchMedia fingerprinting detection used in bot protection
    // See: https://github.com/brave/brave-browser/issues/46541
    if (formBotValue !== "brave") {
      const submitTime = parseInt(formBotValue, 16);
      // Assumes that the difference between the server time and the form submission time,
      // including any client-server time drift, is within a 5-minute range.
      // Note: submitTime might be NaN because formBotValue can be any string used for logging purposes.
      // Example: `formBotValue: jsdom`, or `formBotValue: headless-env`
      if (
        Number.isNaN(submitTime) ||
        Math.abs(Date.now() - submitTime) > 1000 * 60 * 5
      ) {
        throw new Error(`Form bot value invalid ${formBotValue}`);
      }
    }

    formData.delete(formIdFieldName);
    formData.delete(formBotFieldName);

    if (resource) {
      resource.body = Object.fromEntries(formData);
    } else {
      if (contactEmail === undefined) {
        throw new Error("Contact email not found");
      }

      resource = context.getDefaultActionResource?.({
        url,
        projectId,
        contactEmail,
        formData,
      });
    }

    if (resource === undefined) {
      throw Error("Resource not found");
    }
    const { ok, statusText } = await loadResource(fetch, resource);
    if (ok) {
      return { success: true };
    }
    return { success: false, errors: [statusText] };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
};

const PageBoundary = memo(
  ({ url, system }: ComponentProps<typeof Page> & { url: string }) => {
    // Use the URL as the key to force scripts in HTML Embed to reload on dynamic pages
    return <Page key={url} system={system} />;
  },
  // React Router can rerender the current route while the next route loaders are
  // still pending. Keep the generated page out of that pending-navigation render
  // path, but let URL changes remount it.
  (prevProps, nextProps) => prevProps.url === nextProps.url
);

const Outlet = () => {
  const { system, resources, url, pageMeta, host } =
    useLoaderData<typeof loader>();
  const sdkContext = useMemo(
    () => ({
      ...constants,
      resources,
      breakpoints,
      onError: console.error,
    }),
    [resources]
  );

  return (
    <ReactSdkContext.Provider value={sdkContext}>
      <PageBoundary url={url} system={system} />
      <PageSettingsMeta
        url={url}
        pageMeta={pageMeta}
        host={host}
        siteName={siteName}
        imageLoader={constants.imageLoader}
        assetBaseUrl={constants.assetBaseUrl}
      />
      <PageSettingsTitle>{pageMeta.title}</PageSettingsTitle>
    </ReactSdkContext.Provider>
  );
};

export default Outlet;
