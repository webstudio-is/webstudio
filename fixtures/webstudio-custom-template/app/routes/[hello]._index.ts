import { type LoaderFunctionArgs, redirect } from "@remix-run/server-runtime";

export const loader = (arg: LoaderFunctionArgs) => {
  return redirect("/world", 301);
};
