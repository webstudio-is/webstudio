/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node/globals" />

import "@webstudio-is/remix";
// not sure why it doesn't understand the ~ path alias here
import { Env as MyEnv } from "./app/env.server";

declare module "@webstudio-is/remix" {
  export interface Env extends MyEnv {}
}
