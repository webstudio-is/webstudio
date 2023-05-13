import type {
  LoaderArgs,
  V2_MetaFunction as MetaFunction,
} from "@remix-run/node";
import { Root } from "~/shared/remix";
import env from "~/env/env.public.server";
import { getThemeData } from "~/shared/theme";

export const loader = async ({ request }: LoaderArgs) => {
  return {
    env,
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Webstudio Login" }];
};

export default Root;
