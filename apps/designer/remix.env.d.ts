/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node/globals" />

import type { Env } from "~/app/env.server";

declare module "@webstudio-is/remix" {
  export type env = Env;
}
