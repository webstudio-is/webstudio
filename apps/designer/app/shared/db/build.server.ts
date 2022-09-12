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

export const loadDevByProjectId = async (
  projectId: Build["projectId"]
): Promise<Build> => {
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
  }

  const build = await prisma.build.findFirst({
    where: { projectId, isDev: true },
  });

  if (build === null) {
    throw new Error("Build not found");
  }

  return parseBuild(build);
};

export const loadProdByProjectId = async (
  projectId: Build["projectId"]
): Promise<Build | undefined> => {
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
  }

  const build = await prisma.build.findFirst({
    where: { projectId, isProd: true },
  });

  if (build === null) {
    return undefined;
  }

  return parseBuild(build);
};

// Each project has a mutable dev build.
// When user edits a project we update the dev build and other objects it references.
// (As opposed to cloning a build, which we do for production builds)
export const createDev = async (projectId: Build["projectId"]) => {
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

export const clone = async (build: Build) => {
  // @todo: clone pages other than home page

  const treeId = build.pages.homePage.treeId;

  const tree = await db.tree.clone(treeId);
  await db.props.clone({ previousTreeId: treeId, nextTreeId: tree.id });
  await db.breakpoints.clone({ previousTreeId: treeId, nextTreeId: tree.id });

  const pages = PagesSchema.parse({
    homePage: {
      ...build.pages.homePage,
      id: uuid(),
      treeId: tree.id,
    },
    pages: [],
  });

  const cloneBuild = await prisma.build.create({
    data: {
      pages: JSON.stringify(pages),
      isDev: false,
      isProd: false,
      projectId: build.projectId,
    },
  });

  return parseBuild(cloneBuild);
};

export const setAsProd = async (buildId: Build["id"]) => {
  await prisma.$transaction(async (transaction) => {
    const build = await transaction.build.findUnique({
      where: { id: buildId },
    });

    if (build === null) {
      throw new Error("Build not found");
    }

    await transaction.build.updateMany({
      where: { projectId: build.projectId, isProd: true },
      data: { isProd: false },
    });

    await transaction.build.update({
      where: { id: build.id },
      data: { isProd: true },
    });
  });
};
