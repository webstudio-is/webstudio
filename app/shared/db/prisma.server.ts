import {
  PrismaClient,
  Prisma,
  type InstanceProps,
  type Project,
} from "@prisma/client";

export const prisma = new PrismaClient();
export { Project, Prisma, InstanceProps };

const main = async () => {
  await prisma.$connect();
};

main()
  .catch((error) => {
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
