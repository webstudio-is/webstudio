import { nanoid } from "nanoid";
import { PrismaClient } from "./client";

type DataSource = {
  type: "parameter";
  id: string;
  scopeInstanceId?: string;
  name: string;
};

type Page = {
  id: string;
  name: string;
  path: string;
  title: string;
  meta: {
    description?: string;
    title?: string;
    excludePageFromSearch?: string;
    language?: string;
    socialImageAssetId?: string;
    socialImageUrl?: string;
    status?: string;
    redirect?: string;
    custom?: Array<{
      property: string;
      content: string;
    }>;
  };
  rootInstanceId: string;
  pathParamsDataSourceId?: string;
  systemDataSourceId?: string;
};

type Pages = {
  homePage: Page;
  pages: Page[];
};

export default async () => {
  const client = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
      },
    },
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      const chunkSize = 1000;
      let cursor: undefined | string = undefined;
      let hasNext = true;

      while (hasNext) {
        console.info("CHUNK", cursor);
        console.time("read");

        const cursorOptions: {} = cursor
          ? {
              skip: 1, // Skip the cursor
              cursor: { id: cursor },
            }
          : {};

        const builds = await prisma.build.findMany({
          select: {
            id: true,
            pages: true,
            dataSources: true,
          },
          take: chunkSize,
          orderBy: {
            id: "asc",
          },
          //where: { id: "d55ce7ea-6853-40af-8a65-b63b79dde0f9" },
          ...cursorOptions,
        });
        console.timeEnd("read");

        console.time("parse-change");
        cursor = builds.at(-1)?.id;
        hasNext = builds.length === chunkSize;
        const changedBuilds: typeof builds = [];

        for (const build of builds) {
          const pages: Pages = JSON.parse(build.pages);
          const dataSources: DataSource[] = JSON.parse(build.dataSources);
          // Already migrated
          if (pages.homePage.systemDataSourceId) {
            continue;
          }
          const updatePage = (page: Page) => {
            const dataSource: DataSource = {
              id: nanoid(),
              scopeInstanceId: page.rootInstanceId,
              name: "system",
              type: "parameter",
            };
            dataSources.push(dataSource);
            page.systemDataSourceId = dataSource.id;
          };
          try {
            updatePage(pages.homePage);
            for (const page of pages.pages) {
              updatePage(page);
            }
            build.pages = JSON.stringify(pages);
            build.dataSources = JSON.stringify(dataSources);
            changedBuilds.push(build);
          } catch {
            console.info(`build ${build.id} cannot be converted`);
          }
        }

        if (changedBuilds.length === 0) {
          return;
        }

        console.timeEnd("parse-change");
        console.info("changedBuilds.length", changedBuilds.length);
        console.time("update");

        const sql = `
          UPDATE "Build"
          SET
            "pages" = data."pages",
            "dataSources" = data."dataSources"
          FROM unnest(ARRAY[$1], ARRAY[$2], ARRAY[$3]) as data(id, pages, "dataSources")
          WHERE "Build"."id" = data."id"
        `;

        const res = await prisma.$executeRawUnsafe(
          sql,
          changedBuilds.map((changedBuild) => changedBuild.id),
          changedBuilds.map((changedBuild) => changedBuild.pages),
          changedBuilds.map((changedBuild) => changedBuild.dataSources)
        );

        console.timeEnd("update");
        console.info("res", res);
      }
    },
    { timeout: 3600000 }
  );
};
