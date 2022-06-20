import {
  PrismaClient,
  Prisma,
  PrismaClientKnownRequestError,
} from "@webstudio-is/sdk/lib/prisma.server";

export const prisma = new PrismaClient();
export { Prisma, PrismaClientKnownRequestError };

const main = async () => {
  await prisma.$connect();
};

main().catch((error) => {
  throw error;
});
