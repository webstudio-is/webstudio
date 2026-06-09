import { type LoaderFunctionArgs, redirect } from "react-router";
import { generateRedirectUrl } from "../redirect-url";
import { url, status } from "__REDIRECT__";

export const loader = (arg: LoaderFunctionArgs) => {
  throw redirect(generateRedirectUrl(url, arg.params), status);
};
