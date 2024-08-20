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
  });

  return client;
};
