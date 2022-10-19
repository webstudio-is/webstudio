import { PrismaClient } from "./client";
import { z } from "zod";

const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  title: z.string(),
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
});

const PagesSchema = z.object({
  homePage: PageSchema,
  pages: z.array(PageSchema),
});

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(
    async (prisma) => {
      const builds = await prisma.build.findMany();
      const breakpoints = await prisma.breakpoints.findMany();

      const buildsParsed = builds.map((build) => ({
        id: build.id,
        pages: PagesSchema.parse(JSON.parse(build.pages)),
      }));

      await Promise.all(
        breakpoints.map((breakpoint) => {
          const build = buildsParsed.find(
            (build) => build.pages.homePage.treeId === breakpoint.treeId
          );

          if (build === undefined) {
            // eslint-disable-next-line no-console
            console.warn(
              `Build not found for breakpoint ${breakpoint.treeId}. Deleting!`
            );

            return prisma.breakpoints.delete({
              where: { treeId: breakpoint.treeId },
            });
          }

          return prisma.breakpoints.update({
            where: { treeId: breakpoint.treeId },
            data: {
              buildId: build.id,
            },
          });
        })
      );
    },
    { timeout: 1000 * 60 }
  );
};
