import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import {
  createClient,
  type Database,
} from "@webstudio-is/postgrest/index.server";

const execFileAsync = promisify(execFile);

const postgrestUrl = process.env.POSTGREST_URL ?? "http://127.0.0.1:55433";
const postgrestApiKey = process.env.POSTGREST_API_KEY ?? "";
const composeFile = fileURLToPath(
  new URL("../docker-compose.e2e.yaml", import.meta.url)
);

const postgrest = createClient(postgrestUrl, postgrestApiKey);

const throwIfError = <Data>({
  error,
  data,
}: {
  error: { message: string } | null;
  data: Data;
}): NonNullable<Data> => {
  if (error) {
    throw new Error(error.message);
  }
  if (data === null || data === undefined) {
    throw new Error("Expected PostgREST response data");
  }
  return data;
};

export const resetDatabase = async () => {
  const sql = `
    DO $$
    DECLARE
      table_names text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
      INTO table_names
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> '_prisma_migrations';

      IF table_names IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || table_names || ' RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `;

  await execFileAsync(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "user",
      "-d",
      "webstudio",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    { maxBuffer: 1024 * 1024 }
  );
};

type Tables = Database["public"]["Tables"];

export const updateBuild = async (
  id: string,
  row: Tables["Build"]["Update"]
) => {
  return throwIfError(
    await postgrest.from("Build").update(row).eq("id", id).select().single()
  );
};

export const insertAuthorizationToken = async (
  row: Tables["AuthorizationToken"]["Insert"]
) => {
  return throwIfError(
    await postgrest.from("AuthorizationToken").insert(row).select().single()
  );
};

export const insertFile = async (row: Tables["File"]["Insert"]) => {
  return throwIfError(
    await postgrest.from("File").insert(row).select().single()
  );
};

export const insertAsset = async (row: Tables["Asset"]["Insert"]) => {
  return throwIfError(
    await postgrest.from("Asset").insert(row).select().single()
  );
};

export const loadDevBuild = async ({
  projectId,
}: {
  projectId: string;
}): Promise<Database["public"]["Tables"]["Build"]["Row"]> => {
  return throwIfError(
    await postgrest
      .from("Build")
      .select("*")
      .eq("projectId", projectId)
      .is("deployment", null)
      .order("createdAt", { ascending: false })
      .limit(1)
      .single()
  );
};
