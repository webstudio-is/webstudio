import type { ServerRuntimeMetaFunction as MetaFunction } from "@remix-run/server-runtime";
import { Root } from "~/shared/remix/root";

export const meta: MetaFunction = () => {
  return [{ title: "Webstudio Dashboard" }];
};

export default Root;

export const config = {
  maxDuration: 30,
};
