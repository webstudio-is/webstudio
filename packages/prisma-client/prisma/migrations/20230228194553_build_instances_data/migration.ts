import { PrismaClient } from "./client";

type InstanceId = string;
type BuildId = string;

type Child =
  | { type: "text"; value: string }
  | { type: "id"; value: InstanceId };

type Instance = {
  id: InstanceId;
  children: Child[];
};

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      let instancesByBuildId = new Map<BuildId, Instance[]>();

      const chunkSize = 1000;
      let cursor: undefined | { id: string; projectId: string } = undefined;
      let hasNext = true;
      while (hasNext) {
        const trees = await prisma.tree.findMany({
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
        const lastTree = trees.at(-1);
        if (lastTree) {
          cursor = { id: lastTree.id, projectId: lastTree?.projectId };
        }
        hasNext = trees.length === chunkSize;

        for (const tree of trees) {
          try {
            const treeInstances: Instance[] = JSON.parse(tree.instances);
            const buildInstances = instancesByBuildId.get(tree.buildId) ?? [];
            instancesByBuildId.set(tree.buildId, [
              ...buildInstances,
              ...treeInstances,
            ]);
          } catch {
            console.info(`Tree ${tree.id} cannot be converted`);
          }
        }
      }

      cursor = undefined;
      hasNext = true;
      while (hasNext) {
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
          const instances = instancesByBuildId.get(build.id) ?? [];
          build.instances = JSON.stringify(instances);
        }

        await Promise.all(
          builds.map(({ id, projectId, instances }) =>
            prisma.build.update({
              where: { id_projectId: { id, projectId } },
              data: { instances },
            })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
