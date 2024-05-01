import { PrismaClient, Prisma } from "./__generated__";

export type {
  User,
  Build,
  Project,
  Asset,
  File,
  DashboardProject,
  AuthorizationToken,
  DomainStatus,
  Domain,
  ProjectWithDomain,
  LatestBuildPerProjectDomain,
  LatestBuildPerProject,
  PublishStatus,
  Product,
  $Enums,
} from "./__generated__";

export { Prisma };
export const { PrismaClientKnownRequestError, Decimal } = Prisma;

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

type PrismaClientOptions = {
  datasourceUrl: string;
  timeout?: number;
  maxWait?: number;
};

export const createPrisma = ({
  datasourceUrl,
  timeout = 5000,
  maxWait = 2000,
}: PrismaClientOptions) => {
  return new PrismaClient({
    datasourceUrl,
    transactionOptions: {
      timeout,
      maxWait,
    },
  });
};

// this fixes the issue with `warn(prisma-client) There are already 10 instances of Prisma Client actively running.`
// explanation here
// https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
export const prisma =
  global.prisma ||
  new PrismaClient({
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

  console.info(
    "Query: " +
      e.query
        .replace(/"public"\./g, "")
        .replace(/"Project"\./g, "")
        .replace(/"Build"\./g, "")
        .replace(/"AuthorizationToken"\./g, "")
        .replace(/"Asset"\./g, "")
  );

  console.info("Params: " + e.params.slice(0, 200));

  console.info("Duration: " + e.duration + "ms");
});

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
