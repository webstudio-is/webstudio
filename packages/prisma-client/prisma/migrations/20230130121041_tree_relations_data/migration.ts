import { PrismaClient } from "./client";

type TreeId = string;
type BuildId = string;
type ProjectId = string;

type Page = {
  id: string;
  name: string;
  path: string;
  title: string;
  meta: any;
  treeId: TreeId;
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
      const buildIdPerTreeId = new Map<TreeId, BuildId>();
      const projectIdPerTreeId = new Map<TreeId, ProjectId>();

      let cursor: undefined | string = undefined;
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
                cursor: { id: cursor },
              }
            : null),
        });
        cursor = builds.at(-1)?.id;
        hasNext = builds.length === chunkSize;

        for (const build of builds) {
          try {
            const pages: Pages = JSON.parse(build.pages);
            buildIdPerTreeId.set(pages.homePage.treeId, build.id);
            projectIdPerTreeId.set(pages.homePage.treeId, build.projectId);
            for (const page of pages.pages) {
              buildIdPerTreeId.set(page.treeId, build.id);
              projectIdPerTreeId.set(page.treeId, build.projectId);
            }
          } catch {
            console.info(`Build ${build.id} cannot be parsed`);
          }
        }
      }

      cursor = undefined;
      hasNext = true;
      while (hasNext) {
        const chunkSize = 1000;
        const trees = await prisma.tree.findMany({
          take: chunkSize,
          orderBy: {
            id: "asc",
          },
          ...(cursor
            ? {
                skip: 1, // Skip the cursor
                cursor: { id: cursor },
              }
            : null),
        });
        cursor = trees.at(-1)?.id;
        hasNext = trees.length === chunkSize;

        for (const tree of trees) {
          const buildId = buildIdPerTreeId.get(tree.id);
          const projectId = projectIdPerTreeId.get(tree.id);
          if (buildId && projectId) {
            tree.buildId = buildId;
            tree.projectId = projectId;
          }
        }
        await Promise.all(
          trees.map(({ id, buildId, projectId }) =>
            prisma.tree.update({ where: { id }, data: { buildId, projectId } })
          )
        );
      }

      await prisma.tree.deleteMany({
        where: {
          OR: [
            {
              buildId: { equals: null },
            },
            {
              projectId: { equals: null },
            },
          ],
        },
      });
    },
    { timeout: 1000 * 60 * 5 }
  );
};
