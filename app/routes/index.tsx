import { redirect, useLoaderData } from "remix";
import { type LoaderFunction } from "remix";
import config from "~/config";
import * as preview from "./preview/$id";
import * as db from "~/shared/db";

// @todo all this subdomain logic is very hacky

type LoaderData = { tree: db.Tree | null; errors?: string };

export const loader: LoaderFunction = async ({ request }) => {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const [subdomain, domain] = host.split(".");
  // We render the site from a subdomain
  if (subdomain !== "www" && domain !== undefined) {
    const data = {} as LoaderData;
    try {
      data.tree = await db.tree.loadForDomain(subdomain);
    } catch (error) {
      if (error instanceof Error) {
        data.errors = error.message;
      }
    }
    return data;
  }

  return redirect(config.dashboardPath);
};

export default () => {
  const data = useLoaderData();
  if (data.errors) {
    return <p>{data.errors}</p>;
  }

  // We render the site from a subdomain
  if (data.tree) {
    return preview.default();
  }
  return null;
};
