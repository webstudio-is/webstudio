import { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Designer } from "~/shared/documents/designer";
import env from "~/env.server";
import { getServerTheme } from "~/shared/theme/theme.server";

export const loader: LoaderFunction = async ({ request }) => {
  return {
    env,
    theme: await getServerTheme(request),
  };
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio Login" };
};

export default Designer;
