import type { Database } from "./__generated__/db-types";
import { PostgrestClient } from "@supabase/postgrest-js";
export type { Database } from "./__generated__/db-types";

type DatabaseWithAssetRevision = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      swap_asset_file: {
        Args: {
          asset_id: string;
          expected_name: string;
          project_id: string;
          replacement_name: string;
        };
        Returns: string;
      };
    };
  };
};

export type Client = PostgrestClient<DatabaseWithAssetRevision>;

export const createClient = (url: string, apiKey: string): Client => {
  const client = new PostgrestClient<DatabaseWithAssetRevision>(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
  });

  return client;
};
