import { prisma, Build as DbBuild } from "@webstudio-is/prisma-client";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import * as db from ".";

const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  title: z.string(),
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
});

type Page = z.infer<typeof PageSchema>;

const PagesSchema: z.ZodType<{ homePage: Page; pages: Array<Page> }> = z.object(
  {
    homePage: PageSchema,
    pages: z.array(PageSchema),
  }
);

type Pages = z.infer<typeof PagesSchema>;

type Build = Omit<DbBuild, "pages"> & { pages: Pages };

export const parseBuild = (build: DbBuild): Build => {
  const pages = PagesSchema.parse(JSON.parse(build.pages));

  return { ...build, pages };
};

export const loadById = async (id: Build["id"]): Promise<Build> => {
  if (typeof id !== "string") {
    throw new Error("Build ID required");
  }

  const build = await prisma.build.findUnique({
    where: { id },
  });

  if (build === null) {
    throw new Error("Build not found");
  }

  return parseBuild(build);
};

export const create = async (projectId: string) => {
  const breakpoints = db.breakpoints.getBreakpointsWithId();
  const tree = await db.tree.create(db.tree.createRootInstance(breakpoints));
  await db.breakpoints.create(tree.id, breakpoints);

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
      isDev: true,
      isProd: false,
      projectId,
    },
  });

  return parseBuild(build);
};
