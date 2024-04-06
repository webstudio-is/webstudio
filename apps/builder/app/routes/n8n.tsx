import type {
  LoaderFunctionArgs,
  ServerRuntimeMetaFunction as MetaFunction,
} from "@remix-run/server-runtime";
import { Root } from "~/shared/remix";
import { getThemeData } from "~/shared/theme";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return {
    theme: await getThemeData(request),
  };
};

export const meta: MetaFunction = () => {
  return [{ title: "Webstudio" }];
};

export default Root;
