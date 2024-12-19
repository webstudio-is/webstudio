import {
  type ServerRuntimeMetaFunction as MetaFunction,
  type LinksFunction,
  type LinkDescriptor,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type HeadersFunction,
  json,
  redirect,
} from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import {
  isLocalResource,
  loadResource,
  loadResources,
  formIdFieldName,
  formBotFieldName,
} from "@webstudio-is/sdk/runtime";
import { ReactSdkContext } from "@webstudio-is/react-sdk/runtime";
import {
  Page,
  siteName,
  favIconAsset,
  pageFontAssets,
  pageBackgroundImageAssets,
} from "../__generated__/[heading-with-id]._index";
import {
  getResources,
  getPageMeta,
  getRemixParams,
  projectId,
  contactEmail,
} from "../__generated__/[heading-with-id]._index.server";
import { assetBaseUrl, imageLoader } from "../constants.mjs";
import css from "../__generated__/index.css?url";
import { sitemap } from "../__generated__/$resources.sitemap.xml";

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

  if (arg.context.EXCLUDE_FROM_SEARCH) {
    pageMeta.excludePageFromSearch = arg.context.EXCLUDE_FROM_SEARCH;
  }

  return json(
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
        "Cache-Control": "public, max-age=600",
      },
    }
  );
};

export const headers: HeadersFunction = () => {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
  };
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const metas: ReturnType<MetaFunction> = [];
  if (data === undefined) {
    return metas;
  }
  const { pageMeta } = data;

  if (data.url) {
    metas.push({
      property: "og:url",
      content: data.url,
    });
  }

  if (pageMeta.title) {
    metas.push({ title: pageMeta.title });

    metas.push({
      property: "og:title",
      content: pageMeta.title,
    });
  }

  metas.push({ property: "og:type", content: "website" });

  const origin = `https://${data.host}`;

  if (siteName) {
    metas.push({
      property: "og:site_name",
      content: siteName,
    });
    metas.push({
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: origin,
      },
    });
  }

  if (pageMeta.excludePageFromSearch) {
    metas.push({
      name: "robots",
      content: "noindex, nofollow",
    });
  }

  if (pageMeta.description) {
    metas.push({
      name: "description",
      content: pageMeta.description,
    });
    metas.push({
      property: "og:description",
      content: pageMeta.description,
    });
  }

  if (pageMeta.socialImageAssetName) {
    metas.push({
      property: "og:image",
      content: `https://${data.host}${imageLoader({
        src: pageMeta.socialImageAssetName,
        // Do not transform social image (not enough information do we need to do this)
        format: "raw",
      })}`,
    });
  } else if (pageMeta.socialImageUrl) {
    metas.push({
      property: "og:image",
      content: pageMeta.socialImageUrl,
    });
  }

  metas.push(...pageMeta.custom);

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
      href: imageLoader({
        src: favIconAsset.name,
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
      href: `${assetBaseUrl}${asset.name}`,
      as: "font",
      crossOrigin: "anonymous",
    });
  }

  for (const backgroundImageAsset of pageBackgroundImageAssets) {
    result.push({
      rel: "preload",
      href: `${assetBaseUrl}${backgroundImageAsset.name}`,
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
  try {
    const url = new URL(request.url);
    url.host = getRequestHost(request);

    const formData = await request.formData();

    const system = {
      params: {},
      search: {},
      origin: url.origin,
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

    formData.delete(formIdFieldName);
    formData.delete(formBotFieldName);

    if (resource) {
      resource.headers.push({
        name: "Content-Type",
        value: "application/json",
      });
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

const Outlet = () => {
  const { system, resources, url } = useLoaderData<typeof loader>();
  return (
    <ReactSdkContext.Provider
      value={{
        imageLoader,
        assetBaseUrl,
        resources,
      }}
    >
      {/* Use the URL as the key to force scripts in HTML Embed to reload on dynamic pages */}
      <Page key={url} system={system} />
    </ReactSdkContext.Provider>
  );
};

export default Outlet;
