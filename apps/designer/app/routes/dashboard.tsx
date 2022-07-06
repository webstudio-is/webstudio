import type { LoaderFunction, MetaFunction } from "@remix-run/node";
import { Designer } from "~/shared/documents/designer";
import env from "~/env.server";

export const loader: LoaderFunction = () => ({
  env,
});

export const meta: MetaFunction = () => {
  return { title: "Webstudio Dashboard" };
};

export default Designer;
