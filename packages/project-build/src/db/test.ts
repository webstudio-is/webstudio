import type { Database } from "./__generated__/db-types";
import { PostgrestClient } from "@supabase/postgrest-js";

const AUTH =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttZHBpeHpvcWlpcmJtcGRpcHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjYzMzY0MjgsImV4cCI6MTk4MTkxMjQyOH0.jjeYvTDrWP9pV7dfZr6fptualNQ3aR13kuPhvT25Sso";
const conn = new PostgrestClient<Database>("http://localhost:3000", {
  headers: {
    apikey: AUTH,
    Authorization: `Bearer ${AUTH}`,
  },
});

const yy = await conn
  .from("Build")
  .select(
    `
    id, Project ( id ), styles

  `
  )
  .eq("id", "cdfd6d55-f7af-40db-84cd-273fdcd999ac")
  .single();

console.info(yy.data);
