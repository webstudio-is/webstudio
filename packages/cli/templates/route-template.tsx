import {
  V2_MetaFunction,
  LinksFunction,
  LinkDescriptor,
  ActionArgs,
  json,
} from "@remix-run/node";

import {
  InstanceRoot,
  type RootPropsData,
  type Data,
} from "@webstudio-is/react-sdk";
import { n8nHandler, hasMatchingForm } from "@webstudio-is/form-handlers";
import { Scripts, ScrollRestoration } from "@remix-run/react";
import {
  fontAssets,
  components,
  pageData,
  user,
  projectId,
  utils,
} from "../__generated__/index";
import css from "../__generated__/index.css";

export type PageData = Omit<Data, "build"> & {
  build: Pick<Data["build"], "props" | "instances" | "dataSources">;
};

export const meta: V2_MetaFunction = () => {
  const { page } = pageData;
  return [{ title: page?.title || "Webstudio", ...page?.meta }];
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
        href: ASSETS_BASE + asset.name,
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

export const action = async ({ request, context }: ActionArgs) => {
  const formData = await request.formData();

  // We're throwing rather than returning \`{ success: false }\`
  // because this isn't supposed to happen normally: bug or malicious user
  if (hasMatchingForm(formData, pageData.build.instances) === false) {
    throw json("Form not found", { status: 404 });
  }

  const email = user?.email;

  if (email == null) {
    return { success: false };
  }

  // wrapped in try/catch just in cases \`new URL()\` throws
  // (should not happen)
  let pageUrl: URL;
  try {
    pageUrl = new URL(request.url);
    pageUrl.host = getRequestHost(request);
  } catch {
    return { success: false };
  }

  const formInfo = {
    formData,
    projectId,
    pageUrl: pageUrl.toString(),
    toEmail: email,
    fromEmail: pageUrl.hostname + "@webstudio.email",
  };

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

  const assetBaseUrl = ASSETS_BASE;
  const imageBaseUrl = ASSETS_BASE;

  const params: Data["params"] = {
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
