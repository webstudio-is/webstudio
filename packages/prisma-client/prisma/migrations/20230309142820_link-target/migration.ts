import { PrismaClient } from "./client";

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      let cursor: undefined | { id: string; projectId: string } = undefined;
      let hasNext = true;
      const chunkSize = 1000;

      hasNext = true;
      while (hasNext) {
        const builds = await prisma.build.findMany({
          take: chunkSize,
          where: {
            OR: [{ isDev: true }, { isProd: true }],
          },
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

        const buildsToUpdate = [];

        for (const build of builds) {
          const props = JSON.parse(build.props);
          let hasConversion = false;

          // prop.value === 'self' > prop.value === '_self'
          for (const prop of props) {
            if (
              prop.name === "target" &&
              typeof prop.value === "string" &&
              prop.value[0] !== "_"
            ) {
              prop.value = `_${prop.value}`;
              hasConversion = true;
            }
          }

          if (hasConversion) {
            build.props = JSON.stringify(props);
            buildsToUpdate.push(build as never);
          }
        }

        await Promise.all(
          buildsToUpdate.map(({ id, projectId, props }) =>
            prisma.build.update({
              where: { id_projectId: { id, projectId } },
              data: { props },
            })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
