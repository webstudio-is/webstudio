import type { Database } from "./__generated__/db-types";
import { PostgrestClient } from "@supabase/postgrest-js";
export type { Database } from "./__generated__/db-types";

export type Client = PostgrestClient<Database>;

export const createClient = (url: string, apiKey: string): Client => {
  const client = new PostgrestClient<Database>(url, {
    async fetch(input: string | URL | globalThis.Request, init?: RequestInit) {
      const res = await fetch(input, init);

      if (typeof input === "string" || input instanceof URL) {
        const url = new URL(input);

        if (url.pathname.endsWith("/Build")) {
          console.info(
            "======ENCODING IS=====",
            res.headers.get("content-encoding")
          );
        }
      }

      return res;
    },

    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      // "Accept-Encoding": "br, gzip, deflate, identity",
    },
  });

  return client;
};
