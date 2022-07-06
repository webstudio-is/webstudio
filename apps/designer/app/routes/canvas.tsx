import { LoaderFunction, type MetaFunction } from "@remix-run/node";
import { Canvas } from "apps/designer/app/shared/documents/canvas";
import env from "apps/designer/app/env.server";

export const loader: LoaderFunction = () => ({
  env,
});

export const meta: MetaFunction = () => {
  return { title: "Webstudio canvas" };
};

export default Canvas;
