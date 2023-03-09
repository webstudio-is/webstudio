import { PrismaClient } from "./client";

type StyleSource = {
  type: "local" | "token";
  id: string;
  treeId?: string;
  name?: string;
};

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      let cursor: undefined | { id: string; projectId: string } = undefined;
      let hasNext = true;

      while (hasNext) {
        const chunkSize = 1000;
        const builds = await prisma.build.findMany({
          take: chunkSize,
          orderBy: {
            id: "asc",
          },
          ...(cursor
            ? {
                skip: 1, // Skip the cursor
                cursor: { id_projectId: cursor },
              }
            : null),
        });
        const lastBuild = builds.at(-1);
        if (lastBuild) {
          cursor = { id: lastBuild.id, projectId: lastBuild.projectId };
        }
        hasNext = builds.length === chunkSize;

        for (const build of builds) {
          try {
            const styleSources: StyleSource[] = JSON.parse(build.styleSources);
            for (const styleSource of styleSources) {
              delete styleSource.treeId;
            }
            build.styleSources = JSON.stringify(styleSources);
          } catch {
            console.info(`Build ${build.id} cannot be converted`);
          }
        }

        await Promise.all(
          builds.map(({ id, projectId, styleSources }) =>
            prisma.build.update({
              where: { id_projectId: { id, projectId } },
              data: { styleSources },
            })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 5 }
  );
};
