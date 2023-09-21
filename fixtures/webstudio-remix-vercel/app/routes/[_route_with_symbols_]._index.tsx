/* eslint-disable camelcase */
import {
  type V2_ServerRuntimeMetaFunction,
  type LinksFunction,
  type LinkDescriptor,
  type ActionArgs,
  json,
} from "@remix-run/server-runtime";

import {
  InstanceRoot,
  type RootPropsData,
  type Params,
} from "@webstudio-is/react-sdk";
import { n8nHandler, getFormId } from "@webstudio-is/form-handlers";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import {
  fontAssets,
  components,
  pageData,
  user,
  projectId,
  utils,
  formsProperties,
} from "../__generated__/[_route_with_symbols_]._index.tsx";
import css from "../__generated__/index.css";
import type { Data } from "@webstudio-is/http-client";
import { assetBaseUrl, imageBaseUrl, imageLoader } from "~/constants.mjs";

export type PageData = Omit<Data, "build"> & {
  build: Pick<Data["build"], "props" | "instances" | "dataSources">;
};

export const meta: V2_ServerRuntimeMetaFunction = () => {
  const { page } = pageData;
  const metas: ReturnType<V2_ServerRuntimeMetaFunction> = [
    { title: page?.title || "Webstudio" },
  ];
  for (const [name, value] of Object.entries(page?.meta ?? {})) {
    if (name.startsWith("og:")) {
      metas.push({
        property: name,
        content: value,
      });
      continue;
    }

    metas.push({
      name,
      content: value,
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

  for (const asset of fontAssets) {
    if (asset.type === "font") {
      result.push({
        rel: "preload",
        href: assetBaseUrl + asset.name,
        as: "font",
        crossOrigin: "anonymous",
        // @todo add mimeType
        // type: asset.mimeType,
      });
    }
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
    hookUrl: context.N8N_FORM_EMAIL_HOOK as string,
  });

  return result;
};

const Outlet = () => {
  const pagesCanvasData: PageData = pageData;

  const page = pagesCanvasData.page;

  if (page === undefined) {
    throw json("Page not found", {
      status: 404,
    });
  }

  const params: Params = {
    assetBaseUrl,
    imageBaseUrl,
  };

  const data: RootPropsData = {
    build: pagesCanvasData.build,
    assets: pagesCanvasData.assets,
    page,
    pages: pagesCanvasData.pages,
    params,
  };

  return (
    <InstanceRoot
      imageLoader={imageLoader}
      data={data}
      components={components}
      utils={utils}
      scripts={
        <>
          <Scripts />
          <ScrollRestoration />
        </>
      }
    />
  );
};

export default Outlet;
