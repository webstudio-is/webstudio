import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Designer } from "~/shared/documents/designer";
import env from "~/env.server";
import { getThemeData } from "~/shared/theme";

export const loader: LoaderFunction = async ({ request }) => {
  return {
    env,
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio" };
};

export default Designer;
