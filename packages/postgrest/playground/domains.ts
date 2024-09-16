#!/usr/bin/env ./playground/pnpm-playground

import { createClient } from "../src/index.server";

const client = createClient(
  process.env.POSTGREST_URL!,
  process.env.POSTGREST_API_KEY!
);

/*
const result = await client
  .from("ProjectWithDomain")
  .select("Domain(*), latestBuildVirtual(*)")
  .eq("projectId", "1bbe90ae-f0b3-4b2d-925f-26c75f824344");
*/

const result = await client
  .from("Project")
  .select(
    "ProjectDomain(Domain(*), latestBuildVirtual(*)), latestBuildVirtual(*)"
  )
  .eq("id", "1bbe90ae-f0b3-4b2d-925f-26c75f824344");

if (result.error) {
  throw result.error;
}

console.info(JSON.stringify(result.data, null, " "));
