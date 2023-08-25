import { PrismaClient, Prisma } from "./__generated__";
const { PrismaClientKnownRequestError, Decimal } = Prisma;

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma:
    | PrismaClient<
        {
          log: "query"[];
        },
        "query"
      >
    | undefined;
}

const logPrisma = process.env.NODE_ENV === "production";

/**
 * All the code below like initialize prisma should be moved into the builder and apps if used.
 * The issue that this project depends on env variables not available in some frameworks
 * getPgBouncerUrl() can be moved as a default fallback for db url at apps/builder/app/env/env.server.ts
 **/
const getPgBouncerUrl = () => {
  // The URL constructor does not support the "postgresql" protocol, so we replace it with "https"
  // to ensure that the connection is made over HTTPS instead of plain text.
  const databaseUrl = new URL(
    process.env.DATABASE_URL!.replace("postgresql://", "https://")
  );

  if (databaseUrl.hostname.endsWith("supabase.co")) {
    // https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler
    databaseUrl.port = "6543";
    // https://www.prisma.io/docs/guides/performance-and-optimization/connection-management/configure-pg-bouncer
    databaseUrl.searchParams.set("pgbouncer", "true");
  }

  // Convert protocol back to "postgresql"
  return databaseUrl.href.replace("https://", "postgresql://");
};

// this fixes the issue with `warn(prisma-client) There are already 10 instances of Prisma Client actively running.`
// explanation here
// https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getPgBouncerUrl(),
      },
    },

    ...(logPrisma
      ? {
          log: [
            { emit: "event", level: "query" },

            {
              emit: "stdout",
              level: "error",
            },
            {
              emit: "stdout",
              level: "info",
            },
            {
              emit: "stdout",
              level: "warn",
            },
          ],
        }
      : {}),
  });

prisma.$on("query", (e) => {
  // Try to minify the query as vercel/new relic log size is limited
  // eslint-disable-next-line no-console
  console.log(
    "Query: " +
      e.query
        .replace(/"public"\./g, "")
        .replace(/"Project"\./g, "")
        .replace(/"Build"\./g, "")
        .replace(/"AuthorizationToken"\./g, "")
        .replace(/"Asset"\./g, "")
  );

  // eslint-disable-next-line no-console
  console.log("Params: " + e.params.slice(0, 200));
  // eslint-disable-next-line no-console
  console.log("Duration: " + e.duration + "ms");
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export { Prisma, PrismaClientKnownRequestError, Decimal };
