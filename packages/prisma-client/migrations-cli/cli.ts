#!/usr/bin/env tsx

/* eslint-disable no-console */

import { Umzug, FileLocker, MigrationMeta } from "umzug";
import fs from "node:fs";
import path from "node:path";
import * as dotenv from "dotenv";
import minimist from "minimist";
import * as prismaMigrations from "./prisma-migrations";

const templateFilePath = path.join(
  prismaMigrations.migrationsDir,
  "template.txt"
);
const lockfilePath = path.join(prismaMigrations.migrationsDir, "lockfile");

const args = minimist(process.argv.slice(2), {
  boolean: ["dev"],
}) as { _: string[]; dev: boolean };

const DEV_MODE = args.dev === true;

const generateClient = (migrationName: string) => {
  const migrationDir = path.join(prismaMigrations.migrationsDir, migrationName);

  const schemaPath = path.join(migrationDir, "schema.prisma");
  const clientPath = path.join(migrationDir, "client");

  if (fs.existsSync(schemaPath) === false) {
    const tsFilePath = prismaMigrations.getMigrationFilePath(
      migrationName,
      "ts"
    );
    if (fs.existsSync(tsFilePath)) {
      throw new Error(
        `Can't generate client for ${migrationName} because ${migrationName}/schema.prisma is missing`
      );
    }
    return;
  }

  if (fs.existsSync(clientPath)) {
    fs.rmSync(clientPath, { recursive: true });
  }

  prismaMigrations.cliGenerate(schemaPath);
};

export const migrator = new Umzug({
  migrations: {
    glob: [
      `./${"[0-9]".repeat(14)}_*`,
      { cwd: prismaMigrations.migrationsDir },
    ],
    resolve(params) {
      const sqlFilePath = prismaMigrations.getMigrationFilePath(
        params.name,
        "sql"
      );
      const tsFilePath = prismaMigrations.getMigrationFilePath(
        params.name,
        "ts"
      );

      if (fs.existsSync(sqlFilePath)) {
        return {
          ...params,
          up: async () => {
            await prismaMigrations.setStarted(params.name, sqlFilePath);
            prismaMigrations.cliExecute(sqlFilePath);
          },
        };
      }

      if (fs.existsSync(tsFilePath)) {
        return {
          ...params,
          up: async () => {
            generateClient(params.name);

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const migration = require(tsFilePath);

            if (typeof migration.default !== "function") {
              throw new Error(
                `Migration file's ${tsFilePath} default export must be a function`
              );
            }

            await prismaMigrations.setStarted(params.name, tsFilePath);
            await migration.default();
          },
        };
      }

      throw new Error(
        `Couldn't find a migration.ts or migration.sql file in migrations/${params.name}`
      );
    },
  },
  context: {},
  storage: {
    logMigration(params) {
      return prismaMigrations.setApplied(params.name);
    },
    unlogMigration() {
      // this is for rollbacks, that we don't currently support
      throw new Error("unlogMigration is not implemented");
    },
    async executed() {
      const migrations = await prismaMigrations.getMigrations();
      return migrations
        .filter(prismaMigrations.isAppliedMigration)
        .map((row) => row.migration_name);
    },
  },
  logger: {
    info: (event) => {
      if (event.event === "migrating") {
        console.log(`Starting ${event.name}`);
        return;
      }
      if (event.event === "migrated") {
        console.log(`${event.name} done in ${event.durationSeconds}s`);
        return;
      }
      if (event.event === "up") {
        console.log(event.message);
        return;
      }
      if (event.event === "created") {
        console.log(`Created: ${event.path}`);
        return;
      }
      console.log(event);
    },
    error: (event) => console.error(event),
    warn: (event) => console.warn(event),
    debug: (event) => console.log(event),
  },
});

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
    pending: await migrator.pending(),
  };
};

// @todo: check what prisma does when a migrations fails, and provide similar functionality
//           - what ends up recorded in _prisma_migrations
//           - what happens in the following attempt to apply the migrations
//           - `migrate resolve` support

export const runCLI = async () => {
  if (DEV_MODE) {
    dotenv.config();
  }

  const command = args._[0];

  if (command === undefined) {
    console.info(USAGE);
    return;
  }

  const status = await getStatus();

  if (command === "create-schema") {
    const name = args._[1];
    if (name === undefined) {
      failWith(
        "Missing name for migration.\nUsage: migrations create-schema <name>"
      );
      return;
    }
    await commands.createSchema({ status, name });
    return;
  }

  if (command === "create-data") {
    const name = args._[1];
    if (name === undefined) {
      failWith(
        "Missing name for migration.\nUsage: migrations create-data <name>"
      );
      return;
    }
    await commands.createData({ status, name });
    return;
  }

  if (command === "migrate") {
    await commands.migrate({ status });
    return;
  }

  if (command === "status") {
    await commands.status({ status });
    return;
  }

  failWith(`Unknown command: ${command}`);
};

const ensureNoFailed = (status: Status) => {
  const failed = status.started.filter(
    (migration) => migration.state === "failed"
  );
  if (failed.length > 0) {
    failWith(
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
    failWith(
      `There are pending migrations:\n${status.pending
        .map((migration) => `  - ${migration.name}`)
        .join(
          "\n"
        )}\n\nPlease apply them first before you can create a new schema migration.\nIf this is a migration you created locally, you can also delete it if you want to start over.`
    );
  }
};

const ensureLastPending = async (migrationsName: string) => {
  const pending = await migrator.pending();
  const last = pending[pending.length - 1];

  if (last === undefined || last.name !== migrationsName) {
    failWith(
      "The migrations you've created did not appear as the last pending migration. This isn't supposed to happen. Please investigate / report this issue."
    );
  }
};

const commands = {
  async createSchema({ name, status }: { name: string; status: Status }) {
    ensureNoFailed(status);

    // Can't proceed if there are pending migrations.
    // We need the database to be up to date before we can do a diff.
    ensureNoPending(status);

    const sqlScript = prismaMigrations.cliDiff();

    if (
      sqlScript === undefined ||
      sqlScript
        .split("\n")
        // When there are no changes, prisma generates "-- This is an empty migration"
        .filter((line) => line.startsWith("--") === false)
        .join("\n")
        .trim().length === 0
    ) {
      console.info("No changes to apply");
      process.exit(0);
    }

    const migrationName = prismaMigrations.generateMigrationName(name);

    const filePath = prismaMigrations.getMigrationFilePath(
      migrationName,
      "sql"
    );

    writeFile(filePath, sqlScript);
    console.info(`Created: ${filePath}`);

    console.info("");

    await ensureLastPending(migrationName);

    console.info("The migration is ready. You can now apply it to a database.");
    console.info("");
  },
  async createData({ name, status }: { name: string; status: Status }) {
    ensureNoFailed(status);

    const migrationName = prismaMigrations.generateMigrationName(name);

    const filePath = prismaMigrations.getMigrationFilePath(migrationName, "ts");
    writeFile(filePath, fs.readFileSync(templateFilePath, "utf8"));
    console.info(`Created: ${filePath}`);

    let schemaContent = fs.readFileSync(
      prismaMigrations.schemaFilePath,
      "utf8"
    );

    schemaContent = `// DO NOT EDIT THIS FILE!
// This a copy of your schema.prisma that corresponds to the state of the database 
// when all migrations up until this one are applied.
// It's used to generate a Prisma Client for the migration.

${schemaContent}`;

    schemaContent = schemaContent.replace(
      "// <output-placeholder-for-migrations>",
      `output = "client"`
    );

    const schemaFilePath = path.join(
      prismaMigrations.migrationsDir,
      migrationName,
      "schema.prisma"
    );
    writeFile(schemaFilePath, schemaContent);
    console.info(`Created: ${schemaFilePath}`);

    generateClient(migrationName);
    console.info(
      `Created: ${path.join(
        prismaMigrations.migrationsDir,
        migrationName,
        "client"
      )}`
    );

    console.info("");

    await ensureLastPending(migrationName);

    console.info(
      "The migrations templete is ready. You can now edit the migration.ts file and apply it to a database."
    );
    console.info("");
  },
  async migrate({ status }: { status: Status }) {
    ensureNoFailed(status);

    if (status.pending.length === 0) {
      console.info("No pending migrations\n");
      process.exit(0);
    }

    let locker: FileLocker | undefined;
    if (DEV_MODE) {
      locker = new FileLocker({ path: lockfilePath });
    }

    if (locker) {
      try {
        await locker.getLock();
      } catch (e) {
        failWith(
          `Could not acquire lock!
This means that another process is already running migrations. 
If you're sure no other process is running, please delete the lockfile:
  ${lockfilePath}`
        );
      }
    }

    try {
      await migrator.up();
    } catch (err) {
      console.error();
      console.error(err.stack);
      console.error();

      const migrationName = (err.migration || undefined)?.name;
      if (typeof migrationName === "string") {
        prismaMigrations.setFailed(migrationName, err.stack);
      }

      process.exitCode = 1;
    } finally {
      if (locker) {
        await locker.releaseLock();
      }
    }
  },
  async status({ status }: { status: Status }) {
    console.info(
      `Applied or failed: ${status.started.length === 0 ? "none" : ""}`
    );
    for (const migration of status.started) {
      const fileState =
        migration.fileState === "ok" ? "" : `, file ${migration.fileState}`;
      console.info(
        `  - ${migration.migration.migration_name} (${migration.state}${fileState})`
      );
      const logs = (migration.migration.logs || "").trim();
      if (migration.state === "failed" && logs.length > 0) {
        console.info("");
        console.info(logs);
        console.info("");
      }
    }

    console.info("");
    console.info(`Pending: ${status.pending.length === 0 ? "none" : ""}`);
    for (const migration of status.pending) {
      console.info(`  - ${migration.name}`);
    }

    console.info("");
  },
};

const failWith = (message: string) => {
  console.error(message);
  console.error("");
  process.exit(1);
};

const writeFile = (filePath: string, content: string) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
};

const USAGE = `Usage: migrations <command> [--dev]

Commands:
  create-schema <name> — Create a migration based on the changes in schema.prisma
  create-data <name>   — Create a migration that will change data rather than schema
  migrate              — Apply all pending migrations
  reset                — Clear the database and apply all migrations
  status               — Information about the state of the migrations
  resolve              — Mark a failed migration as applied or rolled-back

Arguments
  --dev                — Lets the CLI know that it's running in a development environment
`;

runCLI();
