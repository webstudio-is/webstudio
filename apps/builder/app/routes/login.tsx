import type {
  LoaderArgs,
  V2_MetaFunction as MetaFunction,
} from "@remix-run/node";
import { Root } from "~/shared/remix";
import env from "~/env/env.public.server";
import { getThemeData } from "~/shared/theme";
// eslint-disable-next-line import/no-internal-modules
import interFont from "@fontsource/inter/variable.css";
// eslint-disable-next-line import/no-internal-modules
import manropeVariableFont from "@fontsource/manrope/variable.css";
// eslint-disable-next-line import/no-internal-modules
import robotoMonoFont from "@fontsource/roboto-mono/index.css";
import appCss from "../app.css";

export const staticLinks = [
  interFont,
  manropeVariableFont,
  robotoMonoFont,
  appCss,
];

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
