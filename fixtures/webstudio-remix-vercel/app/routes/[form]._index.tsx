/* eslint-disable camelcase */
import {
  type V2_ServerRuntimeMetaFunction,
  type LinksFunction,
  type LinkDescriptor,
  type ActionArgs,
  type LoaderArgs,
  type HeadersArgs,
  json,
  redirect,
} from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import { ReactSdkContext } from "@webstudio-is/react-sdk";
import { n8nHandler, getFormId } from "@webstudio-is/form-handlers";
import {
  Page,
  favIconAsset,
  socialImageAsset,
  pageFontAssets,
  pageBackgroundImageAssets,
} from "../__generated__/[form]._index";
import {
  formsProperties,
  loadResources,
  getPageMeta,
  getRemixParams,
  projectId,
  user,
  projectMeta,
} from "../__generated__/[form]._index.server";

import css from "../__generated__/index.css";
import { assetBaseUrl, imageBaseUrl, imageLoader } from "~/constants.mjs";

export const loader = async (arg: LoaderArgs) => {
  const url = new URL(arg.request.url);
  const params = getRemixParams(arg.params);
  const system = {
    params,
    search: Object.fromEntries(url.searchParams),
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

  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";

  url.host = host;
  url.protocol = "https";

  // typecheck
  arg.context.EXCLUDE_FROM_SEARCH satisfies boolean;

  return json(
    {
      host,
      url: url.href,
      excludeFromSearch: arg.context.EXCLUDE_FROM_SEARCH,
      system,
      resources,
      pageMeta,
      projectMeta,
    },
    // No way for current information to change, so add cache for 10 minutes
    // In case of CRM Data, this should be set to 0
    {
      status: pageMeta.status,
      headers: {
        "Cache-Control": "public, max-age=600",
        "x-ws-language": pageMeta.language ?? "en",
      },
    }
  );
};

export const headers = ({ loaderHeaders }: HeadersArgs) => {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "x-ws-language": loaderHeaders.get("x-ws-language"),
  };
};

export const meta: V2_ServerRuntimeMetaFunction<typeof loader> = ({ data }) => {
  const metas: ReturnType<V2_ServerRuntimeMetaFunction> = [];
  if (data === undefined) {
    return metas;
  }
  const { pageMeta, projectMeta } = data;

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

  if (projectMeta?.siteName) {
    metas.push({
      property: "og:site_name",
      content: projectMeta.siteName,
    });
    metas.push({
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: projectMeta.siteName,
        url: origin,
      },
    });
  }

  if (pageMeta.excludePageFromSearch || data.excludeFromSearch) {
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

  if (socialImageAsset) {
    metas.push({
      property: "og:image",
      content: `https://${data.host}${imageLoader({
        src: socialImageAsset.name,
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
        width: 128,
        quality: 100,
        format: "auto",
      }),
      type: undefined,
    });
  } else {
    result.push({
      rel: "icon",
      href: "/favicon.ico",
      type: "image/x-icon",
    });

    result.push({
      rel: "shortcut icon",
      href: "/favicon.ico",
      type: "image/x-icon",
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

const getMethod = (value: string | undefined) => {
  if (value === undefined) {
    return "post";
  }

  switch (value.toLowerCase()) {
    case "get":
      return "get";
    default:
      return "post";
  }
};

export const action = async ({ request, context }: ActionArgs) => {
  const formData = await request.formData();

  const formId = getFormId(formData);
  if (formId === undefined) {
    // We're throwing rather than returning { success: false }
    // because this isn't supposed to happen normally: bug or malicious user
    throw json("Form not found", { status: 404 });
  }

  const formProperties = formsProperties.get(formId);

  // form properties are not defined when defaults are used
  const { action, method } = formProperties ?? {};

  const email = user?.email;

  if (email == null) {
    return { success: false };
  }

  // wrapped in try/catch just in cases new URL() throws
  // (should not happen)
  let pageUrl: URL;
  try {
    pageUrl = new URL(request.url);
    pageUrl.host = getRequestHost(request);
  } catch {
    return { success: false };
  }

  if (action !== undefined) {
    try {
      // Test that action is full URL
      new URL(action);
    } catch {
      return json(
        {
          success: false,
          error: "Invalid action URL, must be valid http/https protocol",
        },
        { status: 200 }
      );
    }
  }

  const formInfo = {
    formData,
    projectId,
    action: action ?? null,
    method: getMethod(method),
    pageUrl: pageUrl.toString(),
    toEmail: email,
    fromEmail: pageUrl.hostname + "@webstudio.email",
  } as const;

  const result = await n8nHandler({
    formInfo,
    hookUrl: context.N8N_FORM_EMAIL_HOOK,
  });

  return result;
};

const Outlet = () => {
  const { system, resources } = useLoaderData<typeof loader>();
  return (
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
};

export default Outlet;
