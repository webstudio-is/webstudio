import { PrismaClient } from "./client";

type PropId = string;
type InstanceId = string;
type BuildId = string;

type Prop = {
  id: PropId;
  instanceId: InstanceId;
};

type Props = Prop[];

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      let propsByBuildId = new Map<BuildId, Props>();

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
            const treeProps: Props = JSON.parse(tree.props);
            const buildProps = propsByBuildId.get(tree.buildId) ?? [];
            propsByBuildId.set(tree.buildId, [...buildProps, ...treeProps]);
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
          // deduplicate badly migrated data
          const props = Array.from(
            new Map(
              (propsByBuildId.get(build.id) ?? []).map((item) => [
                item.instanceId,
                item,
              ])
            ).values()
          );
          build.props = JSON.stringify(props);
        }
        await Promise.all(
          builds.map(({ id, projectId, props }) =>
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
