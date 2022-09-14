import { prisma, Build as DbBuild } from "@webstudio-is/prisma-client";
import { v4 as uuid } from "uuid";
import * as db from ".";
import { Build, Pages, PagesSchema } from "./types";

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

export const loadProdByProjectId = async (
  projectId: Build["projectId"]
): Promise<Build | undefined> => {
  if (typeof projectId !== "string") {
    throw new Error("Project ID required");
  }

  const build = await prisma.build.findFirst({
    where: { projectId, isCurrentProd: true },
  });

  if (build === null) {
    return undefined;
  }

  return parseBuild(build);
};

const createPages = async () => {
  const breakpoints = db.breakpoints.getBreakpointsWithId();
  const tree = await db.tree.create(db.tree.createRootInstance(breakpoints));
  await db.breakpoints.create(tree.id, breakpoints);
  return PagesSchema.parse({
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
};

const clonePages = async (source: Pages) => {
  // @todo: clone pages other than home page

  const treeId = source.homePage.treeId;

  const tree = await db.tree.clone(treeId);
  await db.props.clone({ previousTreeId: treeId, nextTreeId: tree.id });
  await db.breakpoints.clone({ previousTreeId: treeId, nextTreeId: tree.id });

  return PagesSchema.parse({
    homePage: {
      ...source.homePage,
      id: uuid(),
      treeId: tree.id,
    },
    pages: [],
  });
};

export const createDev = async (baseBuild?: Build) => {
  if (baseBuild === undefined) {
    const pages = await createPages();
    return prisma.build.create({
      data: { pages: JSON.stringify(pages) },
    });
  } else {
    const pages = await clonePages(baseBuild.pages);
    return prisma.build.create({
      data: { pages: JSON.stringify(pages) },
    });
  }
};

export const createProd = async (
  sourceBuild: Build,
  projectId: Build["projectId"]
) => {
  const pages = await clonePages(sourceBuild.pages);

  const cloneBuild = await prisma.build.create({
    data: {
      pages: JSON.stringify(pages),
      projectId: projectId,
    },
  });

  await prisma.$transaction([
    prisma.build.updateMany({
      where: { projectId: projectId, isCurrentProd: true },
      data: { isCurrentProd: false },
    }),
    prisma.build.update({
      where: { id: cloneBuild.id },
      data: { isCurrentProd: true },
    }),
  ]);
};
