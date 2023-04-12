import { PrismaClient } from "./client";

// NOTE ON IMPORTS:
//
//   We want to be able to run old migrations at any point.
//   For example, when we setting up a fresh database or making a reset.
//
//   You shouldn't import code that may change later
//   and become incompatible with the migration.
//   It's better to copy it to the migration directory.

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      /*
      There are no minWidth: 0 inside other breakpoints anymore. Manually tested with
      select distinct((breakpoints::jsonb #> '{1, minWidth}')::int) from "Build";

      Below in jsonb syntax:
      #> means select by path
      #- remove at path
      */
      await prisma.$executeRaw`
        UPDATE "Build"
        SET breakpoints = (breakpoints::jsonb #- '{0, minWidth}')::text
        WHERE (breakpoints::jsonb #> '{0, minWidth}')::int = 0;
      `;
    },
    { timeout: 1000 * 60 }
  );
};
