#!/usr/bin/env tsx

import { loadEnvFile } from "node:process";
import * as commands from "./commands";
import * as logger from "./logger";
import * as args from "./args";
import { UserError } from "./errors";

const USAGE = `Usage: migrations <command> [--dev]

Commands:
  create-schema <name> — Create a migration based on the changes in schema.prisma
  create-data <name>   — Create a migration that will change data rather than schema
  migrate              — Apply all pending migrations
  reset                — Clear the database and apply all migrations
  status               — Information about the state of the migrations
  pending-count        — Get the number of pending migrations
  resolve <applied|rolled-back> <name> — Mark a failed migration as applied or rolled-back

Arguments
  --dev                — Lets the CLI know that it's running in a development environment
`;

const main = async () => {
  if (args.values.dev) {
    try {
      loadEnvFile(".env.development");
    } catch {
      // empty block
    }
    try {
      loadEnvFile(".env");
    } catch {
      // empty block
    }
  }

  const command = args.positionals[0];

  if (command === undefined) {
    logger.info(USAGE);
    return;
  }

  if (command === "create-schema") {
    const name = args.positionals[1];
    if (name === undefined) {
      throw new UserError(
        "Missing name for migration.\nUsage: migrations create-schema <name>"
      );
    }
    await commands.createSchema({ name });
    return;
  }

  if (command === "create-data") {
    const name = args.positionals[1];
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

  if (command === "pending-count") {
    const count = await commands.pendingCount();
    console.info("::pending-count::", count);
    return;
  }

  if (command === "resolve") {
    const type = args.positionals[1];

    if (type === undefined || (type !== "applied" && type !== "rolled-back")) {
      throw new UserError(
        "Missing type of resolve.\nUsage: migrations resolve <applied|rolled-back> <migration-name>"
      );
    }

    const name = args.positionals[2];
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
};

const runMain = async () => {
  try {
    await main();
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

runMain();
