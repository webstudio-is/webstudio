import type {
  HeadersFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { Designer } from "~/shared/documents/designer";
import env from "~/env.server";

export const loader: LoaderFunction = () => ({
  env,
});

export const meta: MetaFunction = () => {
  return { title: "Webstudio" };
};

export const headers: HeadersFunction = () => ({
  "Accept-CH": "Sec-CH-Prefers-Color-Scheme",
});

export default Designer;
