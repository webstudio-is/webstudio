import type { KVNamespace } from "@cloudflare/workers-types";

export interface Env {
  __STATIC_CONTENT: KVNamespace;
  SITES: KVNamespace;
}
