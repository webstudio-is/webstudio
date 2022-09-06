import { PrismaClient } from "./client";

export default () => {
  const client = new PrismaClient();
  return client.$transaction(async (prisma) => {
    const usersCount = await prisma.user.count();

    // eslint-disable-next-line no-console
    console.log("Example noop migration test", { usersCount });
  });
};
