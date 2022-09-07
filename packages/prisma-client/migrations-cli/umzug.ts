import { Umzug } from "umzug";
import fs from "node:fs";
import * as prismaMigrations from "./prisma-migrations";
import * as logger from "./logger";
import { UserError } from "./errors";

export const umzug = new Umzug({
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
            prismaMigrations.generateMigrationClient(params.name);

            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const migration = require(tsFilePath);

            if (typeof migration.default !== "function") {
              throw new UserError(
                `Migration file's ${tsFilePath} default export must be a function`
              );
            }

            await prismaMigrations.setStarted(params.name, tsFilePath);
            await migration.default();
          },
        };
      }

      throw new UserError(
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
      // this is for rollbacks, which we don't currently support
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
    ...logger,
    info: (event) => {
      if (event.event === "migrating") {
        logger.info(`Starting ${event.name}`);
        return;
      }
      if (event.event === "migrated") {
        logger.info(`${event.name} done in ${event.durationSeconds}s`);
        return;
      }
      if (event.event === "up") {
        logger.info(event.message);
        return;
      }
      if (event.event === "created") {
        logger.info(`Created: ${event.path}`);
        return;
      }
      logger.info(event);
    },
  },
});
