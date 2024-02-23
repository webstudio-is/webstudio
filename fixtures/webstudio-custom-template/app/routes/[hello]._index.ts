import { type LoaderArgs, redirect } from "@remix-run/server-runtime";

export const loader = (arg: LoaderArgs) => {
  return redirect("/world", 301);
};
