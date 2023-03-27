import { PrismaClient, Prisma } from "./__generated__";
const { PrismaClientKnownRequestError, Decimal } = Prisma;

declare global {
  // allow global `var` declarations
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// this fixes the issue with `warn(prisma-client) There are already 10 instances of Prisma Client actively running.`
// explanation here
// https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
export const prisma =
  global.prisma || new PrismaClient(/* { log: ["query"] } */);

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export { Prisma, PrismaClientKnownRequestError, Decimal };
