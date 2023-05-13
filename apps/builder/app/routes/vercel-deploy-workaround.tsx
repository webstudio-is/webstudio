import type { LinksFunction } from "@remix-run/node";

import { Root } from "~/shared/remix";
// eslint-disable-next-line import/no-internal-modules
import interFont from "@fontsource/inter/variable.css";
// eslint-disable-next-line import/no-internal-modules
import manropeVariableFont from "@fontsource/manrope/variable.css";
// eslint-disable-next-line import/no-internal-modules
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
