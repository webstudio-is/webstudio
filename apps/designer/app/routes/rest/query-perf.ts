import { prisma } from "@webstudio-is/prisma-client";

export const loader = async () => {
  const start = Date.now();
  await prisma.$queryRawUnsafe("SELECT 1");
  const select1 = Date.now() - start;

  const start2 = Date.now();
  await prisma.user.findMany();
  const users = Date.now() - start2;

  return { select1, users };
};
