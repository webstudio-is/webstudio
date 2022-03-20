import { redirect, useLoaderData } from "remix";
import { type LoaderFunction } from "remix";
import { Document, Root, type Data } from "@webstudio-is/sdk";
import config from "~/config";
import * as db from "~/shared/db";

// @todo all this subdomain logic is very hacky

type Error = { errors: string };

export const loader: LoaderFunction = async ({ request }) => {
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    "";
  const [userDomain, designerDomain] = host.split(".");
  // We render the site from a subdomain
  if (typeof userDomain === "string" && typeof designerDomain === "string") {
    try {
      const tree = await db.tree.loadByDomain(userDomain);
      const props = await db.props.loadByTreeId(tree.id);
      return { tree, props };
    } catch (error) {
      if (error instanceof Error) {
        return { errors: error.message };
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
