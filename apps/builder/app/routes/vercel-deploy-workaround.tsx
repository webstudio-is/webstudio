import type { LinksFunction } from "@remix-run/server-runtime";

import { Root } from "~/shared/remix/root";
import interFont from "@fontsource-variable/inter/index.css";
import manropeVariableFont from "@fontsource-variable/manrope/index.css";
import robotoMonoFont from "@fontsource/roboto-mono/index.css";
// eslint-disable-next-line import/no-internal-modules
import appCss from "../shared/app.css";

/**
 * For unknown reason vercel don't upload css assets if they are not exported from route path
 * This is workaround to make sure that all css assets we use in request handler are uploaded
 */

export const links: LinksFunction = () => {
  // `links` returns an array of objects whose
  // properties map to the `<link />` component props
  return [
    { rel: "stylesheet", href: interFont },
    { rel: "stylesheet", href: manropeVariableFont },
    { rel: "stylesheet", href: robotoMonoFont },
    { rel: "stylesheet", href: appCss },
  ];
};

export default Root;
