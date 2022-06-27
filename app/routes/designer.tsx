import type { MetaFunction } from "@remix-run/node";
import { Designer } from "~/shared/documents/designer";

export const meta: MetaFunction = () => {
  return { title: "Webstudio" };
};

export default Designer;
