#!/usr/bin/env tsx

import * as dotenv from "dotenv";
import * as commands from "./commands";
import * as logger from "./logger";
import args from "./args";

const failWith = (message: string) => {
  logger.error(message);
  logger.error("");
  process.exit(1);
};

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
`;

const main = async () => {
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
      failWith(
        "Missing name for migration.\nUsage: migrations create-schema <name>"
      );
      return;
    }
    await commands.createSchema({ name });
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
    // @todo: confirmation prompt

    const type = args._[1];

    if (type === undefined || (type !== "applied" && type !== "rolled-back")) {
      failWith(
        "Missing type of resolve.\nUsage: migrations resolve <applied|rolled-back> <migration-name>"
      );
      return;
    }

    const name = args._[2];
    if (name === undefined) {
      failWith(
        "Missing name of migration.\nUsage: migrations resolve <applied|rolled-back> <migration-name>"
      );
      return;
    }

    await commands.resolve({ migrationName: name, resolveAs: type });
    return;
  }

  if (command === "reset") {
    // @todo: confirmation prompt
    // @todo: allow only in dev mode

    // @todo
    throw new Error("Not implemented");
  }

  failWith(`Unknown command: ${command}`);
};

main();
