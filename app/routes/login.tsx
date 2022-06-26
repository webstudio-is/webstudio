import { MetaFunction } from "@remix-run/node";
import { Designer } from "~/shared/documents/designer";

export const meta: MetaFunction = () => {
  return { title: "Webstudio Login" };
};

export default Designer;
