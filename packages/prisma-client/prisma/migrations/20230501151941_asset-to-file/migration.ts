import { PrismaClient } from "./client";

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      const result = await prisma.$executeRaw`
        INSERT INTO "File"
        (
          "name",
          "format",
          "size",
          "description",
          "createdAt",
          "meta",
          "status"
        )
        SELECT
          "name",
          "format",
          "size",
          "description",
          "createdAt",
          "meta",
          "status"
        FROM "Asset"
        GROUP BY
          "name",
          "format",
          "size",
          "description",
          "createdAt",
          "meta",
          "status";
      `;
      console.info(`${result} files migrated from assets`);
    },
    { timeout: 1000 * 60 }
  );
};
