import type {
  LoaderFunctionArgs,
  ServerRuntimeMetaFunction as MetaFunction,
} from "@remix-run/server-runtime";
import { Root } from "~/shared/remix";
import env from "~/env/env.public.server";
import { getThemeData } from "~/shared/theme";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return {
    env,
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Webstudio Login" }];
};

export default Root;
