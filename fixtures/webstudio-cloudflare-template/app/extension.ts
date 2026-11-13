// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { AppLoadContext } from "@remix-run/server-runtime";

declare module "@remix-run/server-runtime" {
  interface AppLoadContext {
    EXCLUDE_FROM_SEARCH: boolean;
  }
}
