/* eslint-disable camelcase */
import {
  type V2_ServerRuntimeMetaFunction,
  type LinksFunction,
  type LinkDescriptor,
  type ActionArgs,
  type LoaderArgs,
  json,
} from "@remix-run/server-runtime";
import { useLoaderData } from "@remix-run/react";
import type { Page as PageType, ProjectMeta } from "@webstudio-is/sdk";
import { ReactSdkContext } from "@webstudio-is/react-sdk";
import { n8nHandler, getFormId } from "@webstudio-is/form-handlers";
import {
  fontAssets,
  pageData,
  user,
  projectId,
  pagesPaths,
  formsProperties,
  Page,
  imageAssets,
  getRemixParams,
} from "../__generated__/_index";
import { loadResources } from "../__generated__/_index.server";
import css from "../__generated__/index.css";
import { assetBaseUrl, imageBaseUrl, imageLoader } from "~/constants.mjs";

export type PageData = {
  project?: ProjectMeta;
};

export const loader = async (arg: LoaderArgs) => {
  const params = getRemixParams(arg.params);
  const resources = await loadResources({ params });

  const host =
    arg.request.headers.get("x-forwarded-host") ||
    arg.request.headers.get("host") ||
    "";

  const url = new URL(arg.request.url);
  url.host = host;
  url.protocol = "https";

  // typecheck
  arg.context.EXCLUDE_FROM_SEARCH satisfies boolean;

  return json(
    {
      host,
      url: url.href,
      excludeFromSearch: arg.context.EXCLUDE_FROM_SEARCH,
      params,
      resources,
    },
    // No way for current information to change, so add cache for 10 minutes
    // In case of CRM Data, this should be set to 0
    { headers: { "Cache-Control": "public, max-age=600" } }
  );
};

export const headers = () => {
  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
  };
};

export const links: LinksFunction = () => {
  const result: LinkDescriptor[] = [];

  result.push({
    rel: "stylesheet",
    href: css,
  });
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
  const { params, resources } = useLoaderData<typeof loader>();
  return (
    <ReactSdkContext.Provider
      value={{
        imageLoader,
        assetBaseUrl,
        imageBaseUrl,
        pagesPaths,
        resources,
      }}
    >
      <Page params={params} />
    </ReactSdkContext.Provider>
  );
};

export default Outlet;
