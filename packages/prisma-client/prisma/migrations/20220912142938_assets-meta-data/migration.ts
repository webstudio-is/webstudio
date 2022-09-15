import { PrismaClient } from "./client";

// NOTE ON IMPORTS:
//
//   We want to be able to run old migrations at any point.
//   For example, when we setting up a fresh database or making a reset.
//
//   You shouldn't import code that may change later
//   and become incompatible with the migration.
//   It's better to copy it to the migration directory.

export default () => {
  const client = new PrismaClient();

  return client.$transaction(async (prisma) => {
    const previousAssets = await prisma.asset.findMany();
    const update = previousAssets.map((asset) => {
      return {
        id: asset.id,
        description: asset.alt,
        meta: JSON.stringify({
          width: Number(asset.width),
          height: Number(asset.height),
        }),
      };
    });
    await Promise.all(
      update.map(({ id, ...data }) =>
        prisma.asset.update({ where: { id }, data })
      )
    );
  });
};
