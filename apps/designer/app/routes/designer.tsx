import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Designer } from "apps/designer/app/shared/documents/designer";
import env from "apps/designer/app/env.server";

export const loader: LoaderFunction = () => ({
  env,
});

export const meta: MetaFunction = () => {
  return { title: "Webstudio" };
};

export default Designer;
