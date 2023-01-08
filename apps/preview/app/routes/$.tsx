import {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
  redirect,
} from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import djb2a from "djb2a";
import { type Data, InstanceRoot, Root } from "@webstudio-is/react-sdk";
import type { DynamicLinksFunction } from "remix-utils";
import type { Build, Page } from "@webstudio-is/project";
import { buildSitesStorageKey } from "~/lib";
import { Env } from "~/env";

type Error = { errors: string };
export type CanvasData = Data & {
  id: string;
  buildId: Build["id"];
  page: Page;
};

export const meta: MetaFunction = ({ data }: { data: CanvasData }) => {
  if ("errors" in data) {
    return { title: "Error" };
  }
  const { page } = data;
  return { title: page?.title || "Webstudio", ...page?.meta };
};

export const dynamicLinks: DynamicLinksFunction<CanvasData> = ({
  data,
  location,
}) => {
  const searchParams = new URLSearchParams(location.search);
  searchParams.set("pageUrl", data.id);

  const cssHash = djb2a(JSON.stringify(data.tree));
  searchParams.set("css-hash", `${cssHash}`);

  return [
    {
      rel: "stylesheet",
      href: `/s/css/?${searchParams}`,
    },
  ];
};

export const handle = { dynamicLinks };
type MinimalRequest = {
  url: string;
  headers: { get: (name: string) => string | null };
};
export const links: LinksFunction = () => {
  return [];
};

const getRequestHost = (request: MinimalRequest): string =>
  request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

export const getBuildParams = (
  request: MinimalRequest
): {
  projectDomain: string;
  pathname: string;
} => {
  const url = new URL(request.url);
  const requestHost = getRequestHost(request);
  const [projectDomain] = requestHost.split(".");
  return {
    projectDomain,
    pathname: url.pathname,
  };
};

export const loader: LoaderFunction = async ({ context, request }) => {
  try {
    const env = context.env as Env & { RESIZE_ORIGIN: string | null };
    const buildParams = getBuildParams(request);
    if (buildParams === undefined) {
      throw new Error("404");
    }
    const { projectDomain, pathname } = buildParams;
    const kvStoreName = buildSitesStorageKey(projectDomain, pathname);
    const data = await env.SITES.get(kvStoreName);

    if (data == null) {
      throw new Error("404");
    }
    const dataJSON = JSON.parse(data);

    if (dataJSON == null) {
      return redirect("/");
    }
    if (dataJSON.page == null) {
      throw new Error("404");
    }

    const params: CanvasData["params"] = {};

    if (env.RESIZE_ORIGIN != null) {
      params.resizeOrigin = env.RESIZE_ORIGIN;
    }

    return {
      ...dataJSON.page,
      id: pathname,
      params,
    };
  } catch (error) {
    return {
      errors: error instanceof Error ? error.message : String(error),
    };
  }
};

export default function Index() {
  const data = useLoaderData<Data | Error>();

  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }
  if (data.tree && data.props) {
    const Outlet = () => <InstanceRoot data={data} />;
    return <Root Outlet={Outlet} />;
  }
  return null;
}
