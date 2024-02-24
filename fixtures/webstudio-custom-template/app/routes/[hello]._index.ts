<<<<<<< HEAD
import { type LoaderArgs, redirect } from "@remix-run/server-runtime";

export const loader = (arg: LoaderArgs) => {
  return redirect("/world", 301);
=======
export const loader = () => {
  return Response.redirect("/world", 301);
>>>>>>> 2d1936ae4 (Resync and rebuild)
};
