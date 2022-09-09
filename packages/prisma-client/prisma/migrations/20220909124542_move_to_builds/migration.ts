import { PrismaClient, Prisma } from "./client";
import { v4 as uuid } from "uuid";

export default () => {
  const client = new PrismaClient();
  return client.$transaction(async (prisma) => {
    const trees = await prisma.tree.findMany();
    const projects = await prisma.project.findMany();

    const builds: Prisma.BuildCreateManyInput[] = [];

    for (const tree of trees) {
      const project = projects.find(
        (project) =>
          project.devTreeId === tree.id ||
          project.prodTreeId === tree.id ||
          JSON.parse(project.prodTreeIdHistory).includes(tree.id)
      );

      if (project === undefined) {
        continue;
      }

      builds.push({
        pages: JSON.stringify({
          homePage: {
            id: uuid(),
            name: "Home",
            path: "",
            title: "Home",
            meta: {},
            treeId: tree.id,
          },
          pages: [],
        }),
        isDev: project.devTreeId === tree.id,
        isProd: project.prodTreeId === tree.id,
        projectId: project.id,
      });
    }

    await prisma.build.createMany({ data: builds });
  });
};
