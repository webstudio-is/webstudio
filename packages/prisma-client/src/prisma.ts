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

// this fixes the issue with `warn(prisma-client) There are already 10 instances of Prisma Client actively running.`
// explanation here
// https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
export const prisma =
  global.prisma ||
  new PrismaClient({
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
  console.log("Params: " + e.params);
  // eslint-disable-next-line no-console
  console.log("Duration: " + e.duration + "ms");
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export { Prisma, PrismaClientKnownRequestError, Decimal };
