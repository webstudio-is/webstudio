import { PrismaClient } from "./client";

type Folder = {
  id: string;
  name: string;
  slug: string;
  children: string[];
};

type Page = {
  path: string;
  id: string;
  name: string;
  title: string;
  meta: {
    description?: string;
    title?: string;
    // convert boolean to expression
    excludePageFromSearch?: any;
    socialImageAssetId?: string;
    socialImageUrl?: string;
    custom?: Array<{
      property: string;
      content: string;
    }>;
  };
  rootInstanceId: string;
  pathVariableId?: string;
};

type ProjectMeta = {
  siteName?: string;
  faviconAssetId?: string;
  code?: string;
};

type PageRedirectSchema = {
  old: string;
  new: string;
};

type ProjectSettings = {
  atomicStyles?: boolean;
  redirects?: PageRedirectSchema[];
};

type Pages = {
  meta?: ProjectMeta;
  settings?: ProjectSettings;
  homePage: Page;
  pages: Page[];
  folders: Folder[];
};

/**
 * convert all fields to js expression
 * string -> `"string"`
 * false -> `false`
 * undefined -> undefined
 */
const mutatePageMeta = (page: Page) => {
  page.title = JSON.stringify(page.title);
  page.meta.description = JSON.stringify(page.meta.description);
  page.meta.excludePageFromSearch = JSON.stringify(
    page.meta.excludePageFromSearch
  );
  page.meta.socialImageUrl = JSON.stringify(page.meta.socialImageUrl);
  if (page.meta.custom) {
    for (const item of page.meta.custom) {
      item.content = JSON.stringify(item.content);
    }
  }
};

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
          where: {
            AND: [
              {
                deployment: null,
              },
            ],
          },

          ...cursorOptions,
        });
        console.timeEnd("read");

        console.time("parse-change");
        cursor = builds.at(-1)?.id;
        hasNext = builds.length === chunkSize;
        const changedBuilds: typeof builds = [];

        for (const build of builds) {
          const buildId = build.id;
          try {
            const pages: Pages = JSON.parse(build.pages);

            mutatePageMeta(pages.homePage);
            for (const page of pages.pages) {
              mutatePageMeta(page);
            }

            build.pages = JSON.stringify(pages);
            changedBuilds.push(build);
          } catch {
            console.info(`build ${buildId} cannot be converted`);
          }
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

        if (changedBuilds.length === 0) {
          return;
        }
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
