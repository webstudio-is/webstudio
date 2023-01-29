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
      await prisma.$executeRaw`
      INSERT INTO "AuthorizationTokens" (id, "projectId", token, permit)
        SELECT
          gen_random_uuid () AS id,
          id AS projectId,
          gen_random_uuid () AS token,
          'VIEW' AS permit
        FROM
        "Project";
    `;
    },
    { timeout: 1000 * 60 }
  );
};
