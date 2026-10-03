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
  getManagedFormBrowserInfo,
  getManagedFormValues,
  readFormDataWithLimit,
  managedFormRequestParamName,
  validateManagedFormBot,
  validateManagedFormBodyFormats,
  formIdFieldName,
  managedFormIdFieldName,
  formBotFieldName,
  getSystemSearch,
  cachedFetch,
  isFormSubmission,
  validateFormSubmission,
} from "@webstudio-is/sdk/runtime";
import { authenticateProjectRequest } from "@webstudio-is/wsauth";
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
} from "../__generated__/[class-names]._index";
import {
  getResources,
  getManagedFormSubmissions,
  getManagedFormResourceGraph,
  getPageMeta,
  getRemixParams,
  contactEmail,
} from "../__generated__/[class-names]._index.server";
import * as constants from "../constants.mjs";
import css from "../__generated__/index.css?url";
import { sitemap } from "../__generated__/$resources.sitemap.xml";
import { authRoutes } from "../__generated__/$resources.wsauth.server";
import { createGeneratedAssetResourceFetch } from "../__generated__/$resources.asset-query-runtime";
import { createManagedFormResourceFetch } from "../__generated__/$resources.managed-form-fetch.server";
import { assetUrlsByPath } from "../__generated__/$resources.assets";

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

  return cachedFetch(projectId, input, init);
};

export const loader = async (arg: LoaderFunctionArgs) => {
  const authRoute = authenticateProjectRequest(
    arg.request,
    authRoutes,
    projectDomain
  );

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
    ...getSystemSearch(url.searchParams),
    origin: url.origin,
    pathname: url.pathname,
  };

  const generatedFetch = await createGeneratedAssetResourceFetch({
    request: arg.request,
    context: arg.context,
    fallback: customFetch,
  });
  const resources = await loadResources(
    generatedFetch,
    getResources({ system }).data,
    url,
    { signal: arg.request.signal }
  );
  Object.assign(
    resources,
    await loadResources(
      generatedFetch,
      getResources({ system, resources }).contentData ?? new Map(),
      url,
      { signal: arg.request.signal }
    )
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
  params,
}: ActionFunctionArgs): Promise<
  { success: true } | { success: false; errors: string[] }
> => {
  authenticateProjectRequest(request, authRoutes, projectDomain);

  try {
    const url = new URL(request.url);
    const isManagedFormRequest =
      url.searchParams.get(managedFormRequestParamName) === "1";
    url.searchParams.delete(managedFormRequestParamName);
    url.host = getRequestHost(request);

    const formData = isManagedFormRequest
      ? await readFormDataWithLimit(request)
      : await request.formData();

    const system = {
      params: getRemixParams(params ?? {}),
      ...getSystemSearch(url.searchParams),
      origin: url.origin,
      pathname: url.pathname,
    };

    const managedFormIds = formData.getAll(managedFormIdFieldName);
    if (
      (isManagedFormRequest && managedFormIds.length !== 1) ||
      (!isManagedFormRequest && managedFormIds.length > 0)
    ) {
      throw new Error("Invalid Form submission");
    }
    if (managedFormIds.length > 0) {
      const managedFormId = managedFormIds[0];
      if (managedFormIds.length !== 1 || typeof managedFormId !== "string") {
        throw new Error("Invalid Form submission");
      }
      const configured = getManagedFormSubmissions().get(managedFormId);
      if (
        configured === undefined ||
        isFormSubmission(configured.submission) === false
      ) {
        throw new Error("Form submission settings not found");
      }
      const configurationError = validateFormSubmission(configured.submission);
      if (configurationError !== undefined) {
        throw new Error(configurationError);
      }
      if (
        configured.resourceIds.length !==
          configured.submission.destinations.length ||
        configured.resourceIds.some((resourceId) => resourceId === null)
      ) {
        throw new Error("Resource destination not found");
      }
      validateManagedFormBot(formData);
      const graph = getManagedFormResourceGraph(managedFormId, {
        system: {
          params: getRemixParams(params ?? {}),
          ...getSystemSearch(url.searchParams),
          origin: url.origin,
          pathname: url.pathname,
        },
        formData: getManagedFormValues(formData),
        browserInfo: getManagedFormBrowserInfo(
          request,
          typeof context === "object" &&
            context !== null &&
            "cloudflare" in context
            ? (request.headers.get("cf-connecting-ip") ?? undefined)
            : undefined
        ),
      });
      if (graph === undefined || graph.rootIds.length === 0) {
        throw new Error("Form Resource graph not found");
      }
      const validatedGraph = validateManagedFormBodyFormats(graph, formData);
      const protectedFetch = createManagedFormResourceFetch({
        request,
        context,
        projectDomain,
      });
      const results = await loadResources(protectedFetch, validatedGraph, url, {
        signal: request.signal,
        timeoutMs: 10_000,
      });
      const outcomes = Object.values(results);
      if (outcomes.length !== graph.rootIds.length) {
        throw new Error("Form Resource results are incomplete");
      }
      const errors = outcomes.flatMap((result) => {
        if (
          typeof result === "object" &&
          result !== null &&
          "ok" in result &&
          result.ok === true
        ) {
          return [];
        }
        const statusText =
          typeof result === "object" &&
          result !== null &&
          "statusText" in result &&
          typeof result.statusText === "string"
            ? result.statusText.trim()
            : "";
        const status =
          typeof result === "object" &&
          result !== null &&
          "status" in result &&
          typeof result.status === "number"
            ? result.status
            : undefined;
        return [
          statusText ||
            (status === undefined
              ? "Resource request failed"
              : `Resource request failed (${status})`),
        ];
      });
      if (errors.length > 0) {
        return { success: false, errors };
      }
      return { success: true };
    }

    const resourceName = formData.get(formIdFieldName);
    const generatedResources = getResources({ system });
    const actionResource =
      typeof resourceName === "string"
        ? generatedResources.action.get(resourceName)
        : undefined;

    validateManagedFormBot(formData);

    formData.delete(formIdFieldName);
    formData.delete(formBotFieldName);

    let result: Awaited<ReturnType<typeof loadResource>>;
    if (actionResource === undefined) {
      if (contactEmail === undefined) {
        throw new Error("Contact email not found");
      }
      const resource = context.getDefaultActionResource?.({
        url,
        projectId,
        contactEmail,
        formData,
      });
      if (resource === undefined) {
        throw Error("Resource not found");
      }
      result = await loadResource(fetch, resource);
    } else {
      const actionFetch = await createGeneratedAssetResourceFetch({
        request,
        context,
        fallback: customFetch,
      });
      const results = await loadResources(
        actionFetch,
        {
          ...generatedResources.data,
          rootIds: [actionResource.id],
        },
        url,
        {
          requestOverrides: new Map([
            // Mutations must reach the backend on every submission, even when
            // the resource has caching enabled. Dependencies can stay cached.
            [actionResource.id, { body: Object.fromEntries(formData), fetch }],
          ]),
        }
      );
      const actionResult = results[actionResource.outputName];
      if (actionResult === undefined) {
        throw Error("Resource not found");
      }
      result = actionResult as Awaited<ReturnType<typeof loadResource>>;
    }
    const { ok, statusText } = result;
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
      assetUrlsByPath,
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
