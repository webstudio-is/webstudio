import { PrismaClient } from "./client";

type InstanceId = string;
type BuildId = string;
type TreeId = string;

type Instance = {
  id: InstanceId;
};

type Page = {
  id: string;
  treeId: TreeId;
  rootInstanceId: InstanceId;
};

type Pages = {
  homePage: Page;
  pages: Page[];
};

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      let rootInstanceIdByBuildId = new Map<
        `${BuildId}:${TreeId}`,
        InstanceId
      >();

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
            const instances: Instance[] = JSON.parse(tree.instances);
            const rootInstanceId = instances[0].id;
            rootInstanceIdByBuildId.set(
              `${tree.buildId}:${tree.id}`,
              rootInstanceId
            );
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
          const { homePage, pages }: Pages = JSON.parse(build.pages);
          homePage.rootInstanceId = rootInstanceIdByBuildId.get(
            `${build.id}:${homePage.treeId}`
          ) as string;
          for (const page of pages) {
            page.rootInstanceId = rootInstanceIdByBuildId.get(
              `${build.id}:${page.treeId}`
            ) as string;
          }
          build.pages = JSON.stringify({ homePage, pages });
        }

        await Promise.all(
          builds.map(({ id, projectId, pages }) =>
            prisma.build.update({
              where: { id_projectId: { id, projectId } },
              data: { pages },
            })
          )
        );
      }
    },
    { timeout: 1000 * 60 * 8 }
  );
};
