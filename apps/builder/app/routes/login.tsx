import type { ServerRuntimeMetaFunction as MetaFunction } from "@remix-run/server-runtime";
import { Root } from "~/shared/remix";

export const meta: MetaFunction = () => {
  return [{ title: "Webstudio Login" }];
};

export default Root;
