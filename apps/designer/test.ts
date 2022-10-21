// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

import { prisma } from "@webstudio-is/prisma-client";

const main = async () => {
  const start = new Date();
  for (let i = 0; i < 100; i++) {
    await prisma.$executeRawUnsafe("SELECT 1");
  }
  // eslint-disable-next-line no-console
  console.log(`Took ${(new Date().getTime() - start.getTime()) / 100}ms`);
};

main();
