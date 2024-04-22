import type { ServerRuntimeMetaFunction as MetaFunction } from "@remix-run/server-runtime";
import { Root } from "~/shared/remix/root";

export const meta: MetaFunction = () => {
  return [{ title: "Webstudio Login" }];
};

export default Root;

// Reduces Vercel function size from 29MB to 9MB for unknown reasons; effective when used in limited files.
export const config = {
  maxDuration: 30,
};
