import fs from "node:fs";
import path from "node:path";
import { FileLocker, MigrationMeta } from "umzug";
import { inspect } from "node:util";
import * as prismaMigrations from "./prisma-migrations";
import { umzug } from "./umzug";
import * as logger from "./logger";
import * as args from "./args";
import { UserError } from "./errors";

const templateFilePath = path.join(
  prismaMigrations.migrationsDir,
  "template.txt"
);
const lockfilePath = path.join(prismaMigrations.migrationsDir, "lockfile");

const writeFile = (filePath: string, content: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
};

type StartedMigration = {
  migration: prismaMigrations.PrismaMigration;
  state: "applied" | "failed" | "rolled-back";
  fileState: "ok" | "changed" | "deleted";
};

type Status = {
  started: StartedMigration[];
  pending: MigrationMeta[];
};

const getStatus = async (): Promise<Status> => {
  const dbMigrations = await prismaMigrations.getMigrations();

  const started = dbMigrations.map((migration): StartedMigration => {
    const filePathTS = prismaMigrations.getMigrationFilePath(
      migration.migration_name,
      "ts"
    );
    const filePathSQL = prismaMigrations.getMigrationFilePath(
      migration.migration_name,
      "sql"
    );
    const filePath = fs.existsSync(filePathTS) ? filePathTS : filePathSQL;

    const fileState = fs.existsSync(filePath)
      ? prismaMigrations.getFileChecksum(filePath) === migration.checksum
        ? "ok"
        : "changed"
      : "deleted";

    const state = prismaMigrations.isAppliedMigration(migration)
      ? "applied"
      : prismaMigrations.isFailedMigration(migration)
        ? "failed"
        : "rolled-back";

    return { migration, state, fileState };
  });

  return {
    started,
    pending: await umzug.pending(),
  };
};

const ensureNoFailed = (status: Status) => {
  const failed = status.started.filter(
    (migration) => migration.state === "failed"
  );
  if (failed.length > 0) {
    throw new UserError(
      `There are failed migrations:\n${failed
        .map((item) => {
          let text = `  - ${item.migration.migration_name}`;
          const logs = (item.migration.logs || "").trim();
          if (logs.length > 0) {
            text += `\n\n${logs}\n`;
          }
          return text;
        })
        .join(
          "\n"
        )}\n\nPlease mark them as resolved or reset the database before you can proceed.`
    );
  }
};

const ensureNoPending = (status: Status) => {
  if (status.pending.length > 0) {
    throw new UserError(
      `There are pending migrations:\n${status.pending
        .map((migration) => `  - ${migration.name}`)
        .join(
          "\n"
        )}\n\nPlease apply them first before you can create a new schema migration.\nIf this is a migration you created locally, you can also delete it if you want to start over.`
    );
  }
};

const ensureLastPending = async (migrationsName: string) => {
  const pending = await umzug.pending();
  const last = pending[pending.length - 1];

  if (last === undefined || last.name !== migrationsName) {
    throw new UserError(
      "The migrations you've created did not appear as the last pending migration. This isn't supposed to happen. Please investigate / report this issue."
    );
  }
};

const isNoopSql = (sqlScript: string) => {
  return (
    sqlScript
      .split("\n")
      // When there are no changes, prisma generates "-- This is an empty migration"
      .filter((line) => line.startsWith("--") === false)
      .join("\n")
      .trim() === ""
  );
};

const ensureNoChangesInPrismaSchema = async () => {
  const sqlScript = await prismaMigrations.cliDiff();
  if (isNoopSql(sqlScript ?? "") === false) {
    throw new UserError(
      "There are changes in schema.prisma. Please create a schema migration first."
    );
  }
};

export const createSchema = async ({ name }: { name: string }) => {
  const status = await getStatus();

  ensureNoFailed(status);

  // Can't proceed if there are pending migrations.
  // We need the database to be up to date before we can do a diff.
  ensureNoPending(status);

  const sqlScript = await prismaMigrations.cliDiff();

  if (isNoopSql(sqlScript ?? "")) {
    logger.info("No changes to apply");
    process.exit(0);
  }

  const migrationName = prismaMigrations.generateMigrationName(name);

  const filePath = prismaMigrations.getMigrationFilePath(migrationName, "sql");

  writeFile(filePath, sqlScript);
  logger.info(`Created: ${filePath}`);

  logger.info("");

  await ensureLastPending(migrationName);

  logger.info("The migration is ready. You can now apply it to a database.");
  logger.info("");
};

export const createData = async ({ name }: { name: string }) => {
  const status = await getStatus();

  ensureNoFailed(status);
  ensureNoPending(status);
  await ensureNoChangesInPrismaSchema();

  const migrationName = prismaMigrations.generateMigrationName(name);

  const filePath = prismaMigrations.getMigrationFilePath(migrationName, "ts");
  writeFile(filePath, fs.readFileSync(templateFilePath, "utf8"));
  logger.info(`Created: ${filePath}`);

  let schemaContent = fs.readFileSync(prismaMigrations.schemaFilePath, "utf8");

  schemaContent = `// DO NOT EDIT THIS FILE!
// This is a copy of your schema.prisma that corresponds to the state of the database
// when all migrations up until this one are applied.
// It's used to generate a Prisma Client for the migration.

${schemaContent}`;

  schemaContent = schemaContent.replace(
    /\/\/[\s]*<output-placeholder-for-migrations>[\s\S]*?\/\/[\s]*<\/output-placeholder-for-migrations>/g,
    `output = "client"`
  );

  const schemaFilePath = path.join(
    prismaMigrations.migrationsDir,
    migrationName,
    "schema.prisma"
  );
  writeFile(schemaFilePath, schemaContent);
  logger.info(`Created: ${schemaFilePath}`);

  await prismaMigrations.generateMigrationClient(migrationName);
  logger.info(
    `Created: ${path.join(
      prismaMigrations.migrationsDir,
      migrationName,
      "client"
    )}`
  );

  logger.info("");

  await ensureLastPending(migrationName);

  logger.info(
    "The migrations templete is ready. You can now edit the migration.ts file and apply it to a database."
  );
  logger.info("");
};

const up = async () => {
  let locker: FileLocker | undefined;
  if (args.values.dev) {
    locker = new FileLocker({ path: lockfilePath });
  }

  if (locker) {
    try {
      await locker.getLock();
    } catch (error) {
      throw new UserError(
        `Could not acquire lock!
This means that another process is already running migrations.
If you're sure no other process is running, please delete the lockfile:
  $ rm ${lockfilePath}`
      );
    }
  }

  try {
    await umzug.up();
  } catch (error) {
    const originalError: unknown = error.cause || error;
    const originalErrorString =
      (originalError instanceof Error && originalError.stack) ||
      inspect(originalError);

    logger.error("");
    logger.error(originalErrorString);
    logger.error("");

    const migrationName = (error.migration || undefined)?.name;
    if (typeof migrationName === "string") {
      prismaMigrations.setFailed(migrationName, originalErrorString);
    }

    process.exitCode = 1;
  } finally {
    if (locker) {
      await locker.releaseLock();
    }
  }
};

export const migrate = async () => {
  const status = await getStatus();

  ensureNoFailed(status);

  if (status.pending.length === 0) {
    logger.info("No pending migrations\n");
    process.exit(0);
  }

  await up();
};

export const status = async () => {
  const status = await getStatus();

  logger.info(
    `Applied or failed: ${status.started.length === 0 ? "none" : ""}`
  );
  for (const migration of status.started) {
    const fileState =
      migration.fileState === "ok" ? "" : `, file ${migration.fileState}`;
    logger.info(
      `  - ${migration.migration.migration_name} (${migration.state}${fileState})`
    );
    const logs = (migration.migration.logs || "").trim();
    if (migration.state === "failed" && logs.length > 0) {
      logger.info("");
      logger.info(logs);
      logger.info("");
    }
  }

  logger.info("");
  logger.info(`Pending: ${status.pending.length === 0 ? "none" : ""}`);
  for (const migration of status.pending) {
    logger.info(`  - ${migration.name}`);
  }

  logger.info("");
};

export const pendingCount = async () => {
  const status = await getStatus();

  return status.pending.length;
};

// Silimar to https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-resolve
export const resolve = async ({
  migrationName,
  resolveAs,
}: {
  migrationName: string;
  resolveAs: "applied" | "rolled-back";
}) => {
  const status = await getStatus();

  const failed = status.started.filter((m) => m.state === "failed");

  if (
    failed.some(
      ({ migration }) => migration.migration_name === migrationName
    ) === false
  ) {
    throw new UserError(
      `Migration ${migrationName} is not failed. You can resolve only a failed migration.`
    );
  }

  logger.info(`You're about to mark ${migrationName} as ${resolveAs}.`);
  logger.info("This will NOT automatically resolve any issues");
  logger.info("that may have been caused by the failed run.");
  logger.info(
    "You should continue only if you're sure the issues have been resolved."
  );
  logger.info("");

  if (resolveAs === "applied") {
    await prismaMigrations.setApplied(migrationName);
    logger.info(`Resolved ${migrationName} as applied`);
    logger.info("");
    return;
  }

  await prismaMigrations.setRolledBack(migrationName);
  logger.info(`Resolved ${migrationName} as rolled back`);
  logger.info("");
};

export const reset = async () => {
  // Just to make it read the migrations folder
  // and fail early if something is wrong with it.
  await getStatus();

  logger.info("You're about to DELETE ALL INFORMATION from the database,");
  logger.info("and run all migrations from scratch!");
  logger.info("");

  await prismaMigrations.resetDatabase();
  await up();
};
