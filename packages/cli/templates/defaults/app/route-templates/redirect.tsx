import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";
import { generateRedirectUrl } from "../redirect-url";
import { url, status } from "__REDIRECT__";

export const loader = (arg: LoaderFunctionArgs) => {
  return redirect(generateRedirectUrl(url, arg.params), status);
};
