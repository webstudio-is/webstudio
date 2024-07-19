import type { Database } from "./__generated__/db-types";
import { PostgrestClient } from "@supabase/postgrest-js";
export type { Database } from "./__generated__/db-types";

export type Client = PostgrestClient<Database>;

export const createClient = (url: string, apiKey: string): Client => {
  const client = new PostgrestClient<Database>(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    fetch: async (input, init) => {
      // delete init.headers["X-Client-Info"];
      try {
        // For unknown reason this allows brotli encoding to work
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        delete init.headers["Accept"];
      } catch {
        // do nothing
      }
      const res = await fetch(input, init);

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res;
    },
  });

  return client;
};
