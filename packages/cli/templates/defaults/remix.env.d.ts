/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />

import type { LoaderArgs, ActionArgs } from "@remix-run/server-runtime";

declare module "@remix-run/server-runtime" {
  export type LoaderFunctionArgs = LoaderArgs;
  export type ActionFunctionArgs = ActionArgs;
}
