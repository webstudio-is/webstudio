import { LoaderFunction, type MetaFunction } from "@remix-run/node";
import { Canvas } from "~/shared/documents/canvas";
import env from "~/env.server";

export const loader: LoaderFunction = () => ({
  env,
});

export const meta: MetaFunction = () => {
  return { title: "Webstudio canvas" };
};

export default Canvas;
