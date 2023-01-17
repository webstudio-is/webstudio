import type { LoaderArgs, MetaFunction } from "@remix-run/node";
import { Root } from "@webstudio-is/remix";
import env from "~/env";
import { getThemeData } from "@webstudio-is/remix";

export const loader = async ({ request }: LoaderArgs) => {
  return {
    env,
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return { title: "Webstudio" };
};

export default Root;
