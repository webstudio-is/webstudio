import {
  type HeadersFunction,
  redirect,
  type LoaderFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Root, type Data } from "@webstudio-is/sdk";
import config from "~/config";
import * as db from "~/shared/db";
import Document from "./canvas";
import env, { Env } from "~/env.server";

// @todo all this subdomain logic is very hacky

type Error = { errors: string };
type LoaderReturnProps = Promise<
  (Data & { env: Env }) | (Error & { env: Env }) | Response
>;

export const headers: HeadersFunction = () => ({
  "Accept-CH": "Sec-CH-Prefers-Color-Scheme",
});

export const loader: LoaderFunction = async ({
  request,
}): LoaderReturnProps => {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";

  const [userDomain, wstdDomain] = host.split(".");
  // We render the site from a subdomain
  if (
    typeof userDomain === "string" &&
    (wstdDomain === "wstd" || wstdDomain?.includes("localhost"))
  ) {
    try {
      const project = await db.project.loadByDomain(userDomain);
      if (project === null) {
        throw new Error(`Unknown domain "${userDomain}"`);
      }
      if (project.prodTreeId === null) {
        throw new Error(`Site is not published`);
      }
      const [tree, props, breakpoints] = await Promise.all([
        db.tree.loadByProject(project, "production"),
        db.props.loadByTreeId(project.prodTreeId),
        db.breakpoints.load(project.prodTreeId),
      ]);
      if (tree === null) {
        throw new Error(`Tree ${project.prodTreeId} not found`);
      }
      if (breakpoints === null) {
        throw new Error(`Breakpoints for tree ${project.prodTreeId} not found`);
      }
      return { tree, props, breakpoints: breakpoints.values, env };
    } catch (error) {
      if (error instanceof Error) {
        return { errors: error.message, env };
      }
    }
  }

  return redirect(config.dashboardPath);
};

const Index = () => {
  const data = useLoaderData<Data | Error>();
  if ("errors" in data) {
    return <p>{data.errors}</p>;
  }

  // We render the site from a subdomain
  if (data.tree && data.props) {
    const Outlet = () => <Root data={data} />;

    // @todo This is non-standard for Remix, is there a better way?
    // We need to render essentially the preview route but from the index,
    // so we have to know the layout and the outlet from here.
    // Maybe there is a way to tell remix to use the right outlet somehow and avoid passing it?
    return <Document Outlet={Outlet} />;
  }

  return null;
};

export default Index;
