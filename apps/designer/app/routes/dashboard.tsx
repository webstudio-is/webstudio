import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Root } from "~/shared/remix";
import env from "~/env.server";
import { getThemeData } from "~/shared/theme";

export const loader: LoaderFunction = async ({ request }) => {
  return {
    env,
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio Dashboard" };
};

export default Root;
