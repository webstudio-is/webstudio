import { redirect } from "react-router";
import { url, status } from "__REDIRECT__";

export const loader = () => {
  throw redirect(url, status);
};
