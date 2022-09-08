#!/usr/bin/env tsx

import * as dotenv from "dotenv";
import * as commands from "./commands";
import * as logger from "./logger";
import args from "./args";
import { UserError } from "./errors";

const USAGE = `Usage: migrations <command> [--dev]

Commands:
  create-schema <name> — Create a migration based on the changes in schema.prisma
  create-data <name>   — Create a migration that will change data rather than schema
  migrate              — Apply all pending migrations
  reset                — Clear the database and apply all migrations
  status               — Information about the state of the migrations
  resolve <applied|rolled-back> <name> — Mark a failed migration as applied or rolled-back

Arguments
  --dev                — Lets the CLI know that it's running in a development environment
  --force  — Skips the confirmation prompt when running a dangerous command
`;

const main = async () => {
  try {
    if (args.dev) {
      dotenv.config();
    }

    const command = args._[0];

    if (command === undefined) {
      logger.info(USAGE);
      return;
    }

    if (command === "create-schema") {
      const name = args._[1];
      if (name === undefined) {
        throw new UserError(
          "Missing name for migration.\nUsage: migrations create-schema <name>"
        );
      }
      await commands.createSchema({ name });
      return;
    }

    if (command === "create-data") {
      const name = args._[1];
      if (name === undefined) {
        throw new UserError(
          "Missing name for migration.\nUsage: migrations create-data <name>"
        );
      }
      await commands.createData({ name });
      return;
    }

    if (command === "migrate") {
      await commands.migrate();
      return;
    }

    if (command === "status") {
      await commands.status();
      return;
    }

    if (command === "resolve") {
      const type = args._[1];

      if (
        type === undefined ||
        (type !== "applied" && type !== "rolled-back")
      ) {
        throw new UserError(
          "Missing type of resolve.\nUsage: migrations resolve <applied|rolled-back> <migration-name>"
        );
      }

      const name = args._[2];
      if (name === undefined) {
        throw new UserError(
          "Missing name of migration.\nUsage: migrations resolve <applied|rolled-back> <migration-name>"
        );
      }

      await commands.resolve({ migrationName: name, resolveAs: type });
      return;
    }

    if (command === "reset") {
      await commands.reset();
      return;
    }

    throw new UserError(`Unknown command: ${command}`);
  } catch (error) {
    if (error instanceof UserError) {
      logger.error(error.message);
      logger.error("");
      process.exit(1);
    } else {
      throw error;
    }
  }
};

main();
