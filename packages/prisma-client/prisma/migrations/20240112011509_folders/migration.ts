import { PrismaClient } from "./client";

export default async () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });

  await client.$transaction(
    async (prisma) => {
      const chunkSize = 1000;
      let cursor: undefined | string = undefined;
      let hasNext = true;

      while (hasNext) {
        console.log("CHUNK", cursor);
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
          const pages = JSON.parse(build.pages);
          // Already migrated
          if (pages.folders) {
            continue;
          }

          try {
            const pageIds = [pages.homePage, ...pages.pages].map(
              (page) => page.id
            );

            pages.folders = [
              {
                id: "root",
                name: "Root",
                slug: "",
                children: pageIds,
              },
            ];

            build.pages = JSON.stringify(pages);
            changedBuilds.push(build);
          } catch {
            console.info(`build ${build.id} cannot be converted`);
          }
        }

        if (changedBuilds.length === 0) {
          return;
        }

        console.timeEnd("parse-change");
        console.log("changedBuilds.length", changedBuilds.length);
        console.time("update");

        const sql = `
          UPDATE "Build"
          SET
            "pages" = data."pages"
          FROM unnest(ARRAY[$1], ARRAY[$2]) as data(id, pages)
          WHERE "Build"."id" = data."id"
        `;

        const res = await prisma.$executeRawUnsafe(
          sql,
          changedBuilds.map((changedBuild) => changedBuild.id),
          changedBuilds.map((changedBuild) => changedBuild.pages)
        );

        console.timeEnd("update");
        console.log("res", res);
      }
    },
    { timeout: 3600000 }
  );
};
