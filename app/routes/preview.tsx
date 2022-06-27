import { type MetaFunction } from "@remix-run/node";
import { Canvas } from "~/shared/documents/canvas";

export const meta: MetaFunction = () => {
  return { title: "Webstudio site preview" };
};

export default Canvas;
