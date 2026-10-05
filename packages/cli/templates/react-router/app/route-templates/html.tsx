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
  loadManagedFormResources,
  getManagedFormBrowserInfo,
  getManagedFormFailure,
  getManagedFormResponse,
  prepareVisitorConfirmation,
  sendVisitorConfirmation,
  getLegacyFormResponse,
  getManagedFormValues,
  readFormDataWithLimit,
  managedFormRequestParamName,
  validateManagedFormBot,
  validateManagedFormRecipientLimit,
  validateManagedFormBodyFormats,
  formIdFieldName,
  managedFormIdFieldName,
  formBotFieldName,
  getSystemSearch,
  isPlainObject,
  cachedFetch,
  isFormSubmission,
  validateFormSubmission,
  type ManagedFormResponse,
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
} from "__CLIENT__";
import {
  getResources,
  getManagedFormSubmissions,
  getManagedFormResourceGraph,
  getPageMeta,
  getRemixParams,
  contactEmail,
  emailDefaults,
} from "__SERVER__";
import * as constants from "__CONSTANTS__";
import css from "__CSS__?url";
import { sitemap } from "__SITEMAP__";
import { authRoutes } from "__AUTH__";
import { createGeneratedAssetResourceFetch } from "__ASSET_QUERY_RUNTIME__";
import {
  createManagedFormEmailSender,
  createManagedFormResourceFetch,
  validateManagedFormEmail,
} from "__MANAGED_FORM_FETCH__";
import { assetUrlsByPath } from "__ASSETS__";

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
  { success: true } | { success: false; errors: string[] } | ManagedFormResponse
> => {
  authenticateProjectRequest(request, authRoutes, projectDomain);

  let isManagedFormRequest = false;
  try {
    const url = new URL(request.url);
    isManagedFormRequest =
      url.searchParams.get(managedFormRequestParamName) === "1";
    url.searchParams.delete(managedFormRequestParamName);
    // Managed Resource requests use the ingress URL as their resolution base.
    // A client-supplied forwarded host must not choose an egress destination.
    if (!isManagedFormRequest) {
      url.host = getRequestHost(request);
    }

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
    const legacyFormIds = formData.getAll(formIdFieldName);
    const hasOneEndpointForm =
      (managedFormIds.length === 1 && legacyFormIds.length === 0) ||
      (managedFormIds.length === 0 &&
        legacyFormIds.length === 1 &&
        typeof legacyFormIds[0] === "string");
    if (
      (isManagedFormRequest && !hasOneEndpointForm) ||
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
            ? request.headers.get("cf-connecting-ip") ?? undefined
            : undefined
        ),
      });
      if (graph === undefined || graph.rootIds.length === 0) {
        throw new Error("Form Resource graph not found");
      }
      validateManagedFormRecipientLimit(graph);
      const sendEmail = createManagedFormEmailSender({ context, formData });
      const confirmation = prepareVisitorConfirmation({
        fieldName: configured.submission.confirmationEmailField,
        formData,
        subject: emailDefaults.confirmationSubject,
        body: emailDefaults.confirmationBody,
        isDefaultBody: emailDefaults.confirmationBodyIsDefault,
        siteUrl: url.origin,
        sender: emailDefaults.sender,
      });
      if (confirmation !== undefined && sendEmail === undefined) {
        throw new Error("Visitor confirmation requires Webstudio Cloud email");
      }
      const validatedGraph = validateManagedFormBodyFormats(
        graph,
        formData,
        sendEmail !== undefined
      );
      const protectedFetch = createManagedFormResourceFetch({
        request,
        context,
        projectDomain,
      });
      const results = await loadManagedFormResources(
        protectedFetch,
        validatedGraph,
        url,
        {
          signal: request.signal,
          timeoutMs: 10_000,
          retryFailedRoots: true,
          sendEmail,
          validateEmail:
            sendEmail === undefined
              ? undefined
              : (emailRequest) =>
                  validateManagedFormEmail(emailRequest, formData),
          validateDestination: protectedFetch.validateDestination,
        }
      );
      return sendVisitorConfirmation(
        getManagedFormResponse(graph, results),
        confirmation,
        sendEmail,
        request.signal
      );
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
          resources: generatedResources.data.resources.map((resource) =>
            resource.id === actionResource.id
              ? {
                  ...resource,
                  createRequest: (documents) => {
                    const request = resource.createRequest(documents);
                    return {
                      ...request,
                      body: {
                        ...(isPlainObject(request.body) ? request.body : {}),
                        ...Object.fromEntries(formData),
                      },
                    };
                  },
                }
              : resource
          ),
          rootIds: [actionResource.id],
        },
        url,
        {
          requestOverrides: new Map([
            // Mutations must reach the backend on every submission, even when
            // the resource has caching enabled. Dependencies can stay cached.
            [actionResource.id, { fetch }],
          ]),
        }
      );
      const actionResult = results[actionResource.outputName];
      if (actionResult === undefined) {
        throw Error("Resource not found");
      }
      result = actionResult as Awaited<ReturnType<typeof loadResource>>;
    }
    if (isManagedFormRequest) {
      return getLegacyFormResponse(result);
    }
    const { ok, statusText } = result;
    if (ok) {
      return { success: true };
    }
    return { success: false, errors: [statusText] };
  } catch (error) {
    console.error(error);

    const message = error instanceof Error ? error.message : "Unknown error";
    if (isManagedFormRequest) {
      return getManagedFormFailure(message);
    }
    return {
      success: false,
      errors: [message],
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
