// Code for interacting with the Prisma's migration engine.
// We want to preserve semantics of the migrations folder and the _prisma_migrations table.
// https://github.com/prisma/prisma-engines/blob/4.3.0/migration-engine/ARCHITECTURE.md

import { execaSync } from "execa";
import path from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { prisma } from "../src";
import { CliError } from "./cli-error";

export const prismaDir = path.resolve(__dirname, "..", "prisma");
export const schemaFilePath = path.join(prismaDir, "schema.prisma");
export const migrationsDir = path.join(prismaDir, "migrations");

const getDatabaseSchemaName = () => {
  // This should return something like prisma.datasource.schema.
  // Unfortunately, Prisma doesn't expose this information.
  //
  // To do this properly manually we'd need to:
  //   1. Parse the schema file to read `datasource` definition
  //   2. Extract the connection url from the datasource
  //   3. Read `?schema` parameter from the connection url as defined here:
  //        https://www.prisma.io/docs/concepts/database-connectors/postgresql#connection-url
  //
  // 1 and 2 is not trivial, so we assume that DATABASE_URL env variable is used, and jump to 3.
  // But we'll need to find a better way if this becomes a library.

  const defaultSchemaName = "public";

  const urlString = process.env.DATABASE_URL;
  if (urlString === undefined || urlString.trim() === "") {
    return defaultSchemaName;
  }

  const url = new URL(urlString);
  return url.searchParams.get("schema") || defaultSchemaName;
};

export const getMigrationFilePath = (
  migrationName: string,
  type: "ts" | "sql"
) => path.join(migrationsDir, migrationName, `migration.${type}`);

export const ensureMigrationTable = async () => {
  // https://github.com/prisma/prisma-engines/blob/4.3.0/migration-engine/ARCHITECTURE.md#the-_prisma_migrations-table
  // https://github.com/prisma/prisma-engines/blob/88f6ab88e559ef52ab26bc98f1da15200e0c25b4/migration-engine/connectors/sql-migration-connector/src/flavour/postgres.rs#L211-L226
  await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS _prisma_migrations (
    id                      VARCHAR(36) PRIMARY KEY NOT NULL,
    checksum                VARCHAR(64) NOT NULL,
    finished_at             TIMESTAMPTZ,
    migration_name          VARCHAR(255) NOT NULL,
    logs                    TEXT,
    rolled_back_at          TIMESTAMPTZ,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_steps_count     INTEGER NOT NULL DEFAULT 0
  )`;
};

// Fields' descriptions are quoted from ARCHITECTURE.md
// ("we" refers to the Prisma team)
export type PrismaMigration = {
  // A random unique identifier. In practice, a v4 UUID.
  id: string;

  // The sha256 checksum of the migration file.
  // We never ovewrite this once it has been written.
  checksum: string;

  // The timestamp at which the migration completed.
  // We only write this at the end of a successful migration,
  // so this column being not null means the migration completed without error.
  finished_at: Date | null;

  // The complete name of the migration directory (without path prefix).
  migration_name: string;

  // Where we record the error, in case of error.
  logs: string | null;

  // Written by prisma migrate resolve,
  // and causes the row to be ignored by migrate when not null.
  rolled_back_at: Date | null;

  // The creation timestamp of the row in the migrations table.
  // We write this before starting to apply the migration.
  started_at: Date;

  // Should be considered deprecated.
  applied_steps_count: number;
};

export const getMigrations = async () => {
  await ensureMigrationTable();

  return prisma.$queryRaw<
    PrismaMigration[]
  >`select * from _prisma_migrations order by migration_name`;
};

const getByName = async (
  migrationName: string
): Promise<PrismaMigration | undefined> => {
  await ensureMigrationTable();

  const migrations = await prisma.$queryRaw<
    PrismaMigration[]
  >`select * from _prisma_migrations where migration_name = ${migrationName}`;
  return migrations[0];
};

// https://github.com/prisma/prisma-engines/blob/88f6ab88e559ef52ab26bc98f1da15200e0c25b4/migration-engine/connectors/migration-connector/src/checksum.rs
export const getFileChecksum = (filePath: string) => {
  const input = fs.readFileSync(filePath);
  return createHash("sha256").update(input).digest("hex");
};

export const setStarted = async (migrationName: string, filePath: string) => {
  await ensureMigrationTable();

  await prisma.$executeRaw`delete from _prisma_migrations 
                            where id in (
                              select id from _prisma_migrations 
                              where migration_name = ${migrationName} 
                              and rolled_back_at is not null 
                              limit 1
                            )`;

  const existingMigration = await getByName(migrationName);

  // This shouldn't happen normally, checking just in case
  if (existingMigration !== undefined) {
    throw new Error(
      `Can't start ${migrationName}. It has been already started before.`
    );
  }

  const checksum = getFileChecksum(filePath);

  await prisma.$executeRaw`insert into _prisma_migrations (
                            id, 
                            checksum, 
                            migration_name
                          ) values (
                            gen_random_uuid()::text, 
                            ${checksum}, 
                            ${migrationName}
                          )`;
};

export const setFailed = async (migrationName: string, error: string) => {
  await ensureMigrationTable();

  const existingMigration = await getByName(migrationName);

  // The error accured before we started the migration
  // No need to do anything
  if (existingMigration === undefined) {
    return;
  }

  // This shouldn't happen normally, checking just in case
  if (isAppliedMigration(existingMigration)) {
    throw new Error(
      `Can't set ${migrationName} as failed. It has already been applied.`
    );
  }

  await prisma.$executeRaw`update _prisma_migrations set logs = ${error} 
                            where migration_name = ${migrationName}`;
};

export const setApplied = async (migrationName: string) => {
  await ensureMigrationTable();

  const existingMigration = await getByName(migrationName);

  // This shouldn't happen normally, checking just in case
  if (existingMigration === undefined) {
    throw new Error(
      `Can't set ${migrationName} as applied. It hasn't been started yet.`
    );
  }

  // This shouldn't happen normally, checking just in case
  if (isAppliedMigration(existingMigration)) {
    throw new Error(
      `Can't set ${migrationName} as applied. It has already been applied.`
    );
  }

  // https://github.com/prisma/prisma-engines/blob/88f6ab88e559ef52ab26bc98f1da15200e0c25b4/migration-engine/core/src/commands/apply_migrations.rs#L72-L73
  await prisma.$executeRaw`update _prisma_migrations set 
                            finished_at = now(), 
                            applied_steps_count = applied_steps_count + 1 
                          where migration_name = ${migrationName}`;
};

export const setRolledBack = async (migrationName: string) => {
  await ensureMigrationTable();

  const existingMigration = await getByName(migrationName);

  // This shouldn't happen normally, checking just in case
  if (existingMigration === undefined) {
    throw new Error(
      `Can't set ${migrationName} as rolled back. It hasn't been started yet.`
    );
  }

  await prisma.$executeRaw`update _prisma_migrations set rolled_back_at = now() 
                            where migration_name = ${migrationName}`;
};

// https://github.com/prisma/prisma-engines/blob/88f6ab88e559ef52ab26bc98f1da15200e0c25b4/migration-engine/core/src/commands/diagnose_migration_history.rs#L109-L111
// https://github.com/prisma/prisma-engines/blob/88f6ab88e559ef52ab26bc98f1da15200e0c25b4/migration-engine/core/src/commands/apply_migrations.rs#L108-L111
export const isFailedMigration = (migration: PrismaMigration) =>
  migration.rolled_back_at === null && migration.finished_at === null;

// https://github.com/prisma/prisma-engines/blob/88f6ab88e559ef52ab26bc98f1da15200e0c25b4/migration-engine/core/src/commands/diagnose_migration_history.rs#L119-L128
export const isAppliedMigration = (migration: PrismaMigration) =>
  migration.finished_at !== null && migration.rolled_back_at === null;

export const isRolledBackMigration = (migration: PrismaMigration) =>
  migration.rolled_back_at !== null;

// https://github.com/prisma/prisma-engines/blob/88f6ab88e559ef52ab26bc98f1da15200e0c25b4/migration-engine/connectors/migration-connector/src/migrations_directory.rs#L30-L35
export const generateMigrationName = (baseName: string) => {
  const date = new Date();
  const prefix =
    date.getFullYear() +
    [
      date.getMonth() + 1,
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
    ]
      .map((item) => item.toString().padStart(2, "0"))
      .join("");

  // it's VARCHAR(255) in _prisma_migrations
  return `${prefix}_${baseName}`.slice(0, 254);
};

export const resetDatabase = async () => {
  const schemaName = getDatabaseSchemaName();

  // https://github.com/prisma/prisma-engines/blob/b92d74444c1c0298714e9b140a85dd714b8dc7c4/migration-engine/connectors/sql-migration-connector/src/flavour/postgres.rs#L267-L278
  // @todo: need to use something like pg-escape for schemaName, not super urgent as this is only used in development
  await prisma.$executeRawUnsafe(`DROP SCHEMA "${schemaName}" CASCADE`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}"`);
};

// https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-diff
export const cliDiff = () => {
  return execaSync("prisma", [
    "migrate",
    "diff",
    "--from-schema-datasource",
    schemaFilePath,
    "--to-schema-datamodel",
    schemaFilePath,
    "--script",
  ]).stdout;
};

// https://www.prisma.io/docs/reference/api-reference/command-reference#generate
export const cliGenerate = (schemaPath: string) => {
  return execaSync("prisma", ["generate", "--schema", schemaPath]);
};

// https://www.prisma.io/docs/reference/api-reference/command-reference#db-execute
export const cliExecute = (filePath: string) => {
  return execaSync("prisma", [
    "db",
    "execute",
    "--file",
    filePath,
    "--schema",
    schemaFilePath,
  ]);
};

export const generateMigrationClient = (migrationName: string) => {
  const migrationDir = path.join(migrationsDir, migrationName);

  const schemaPath = path.join(migrationDir, "schema.prisma");
  const clientPath = path.join(migrationDir, "client");

  if (fs.existsSync(schemaPath) === false) {
    const tsFilePath = getMigrationFilePath(migrationName, "ts");
    if (fs.existsSync(tsFilePath)) {
      throw new CliError(
        `Can't generate client for ${migrationName} because ${migrationName}/schema.prisma is missing`
      );
    }
    return;
  }

  if (fs.existsSync(clientPath)) {
    fs.rmSync(clientPath, { recursive: true });
  }

  cliGenerate(schemaPath);
};
