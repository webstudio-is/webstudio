import { redirect } from "@remix-run/server-runtime";
import { url, status } from "__REDIRECT__";

export const loader = () => {
  return redirect(url, status);
};
