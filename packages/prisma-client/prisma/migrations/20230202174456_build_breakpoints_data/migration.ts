import { PrismaClient } from "./client";

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      await prisma.$executeRaw`
        UPDATE "Build"
        SET breakpoints="Breakpoints".values
        FROM "Breakpoints"
        WHERE "Build".id="Breakpoints"."buildId";
      `;
    },
    { timeout: 1000 * 60 }
  );
};
