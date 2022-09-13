import { PrismaClient, type Project, type Tree } from "./client";
import { v4 as uuid } from "uuid";
import { z } from "zod";

const TreeHistorySchema = z.array(z.string());

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

const isInHistory = (project: Project, tree: Tree) =>
  TreeHistorySchema.parse(JSON.parse(project.prodTreeIdHistory)).includes(
    tree.id
  );

export default () => {
  const client = new PrismaClient({
    // Uncomment to see the queries in console as the migration runs
    // log: ["query", "info", "warn", "error"],
  });
  return client.$transaction(async (prisma) => {
    const trees = await prisma.tree.findMany();
    const projects = await prisma.project.findMany();

    for (const tree of trees) {
      const project = projects.find(
        (project) =>
          project.devTreeId === tree.id ||
          project.prodTreeId === tree.id ||
          isInHistory(project, tree)
      );

      if (project === undefined) {
        continue;
      }

      const pages = PagesSchema.parse({
        homePage: {
          id: uuid(),
          name: "Home",
          path: "",
          title: "Home",
          meta: {},
          treeId: tree.id,
        },
        pages: [],
      });

      const build = await prisma.build.create({
        data: {
          pages: JSON.stringify(pages),
          isCurrentProd: project.prodTreeId === tree.id,
          projectId: isInHistory(project, tree) ? project.id : undefined,
        },
      });

      if (project.devTreeId === tree.id) {
        await prisma.project.update({
          where: { id: project.id },
          data: { devBuildId: build.id },
        });
      }
    }
  });
};
