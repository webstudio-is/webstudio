import type { LoaderArgs, MetaFunction } from "@remix-run/node";
import { Root, getThemeData } from "@webstudio-is/remix";
import env from "~/env.server";

export const loader = async ({ request }: LoaderArgs) => {
  return {
    env,
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio Dashboard" };
};

export default Root;
