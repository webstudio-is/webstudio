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

export async function loadByProjectId(
  projectId: Build["projectId"],
  env: "dev"
): Promise<Build>;
export async function loadByProjectId(
  projectId: Build["projectId"],
  env: "prod"
): Promise<Build | undefined>;
// eslint-disable-next-line func-style
export async function loadByProjectId(
  projectId: Build["projectId"],
  env: "prod" | "dev"
): Promise<Build | undefined> {
  if (env === "dev") {
    const build = await prisma.build.findFirst({
      where: { projectId, isDev: true },
    });

    if (build === null) {
      throw new Error("Dev build not found");
    }

    return parseBuild(build);
  }

  const build = await prisma.build.findFirst({
    where: { projectId, isProd: true },
  });

  if (build === null) {
    return undefined;
  }

  return parseBuild(build);
}

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

export async function create(
  projectId: Build["projectId"],
  env: "prod",
  sourceBuild: Build
): Promise<void>;
export async function create(
  projectId: Build["projectId"],
  env: "dev",
  sourceBuild?: Build
): Promise<void>;
// eslint-disable-next-line func-style
export async function create(
  projectId: Build["projectId"],
  env: "dev" | "prod",
  sourceBuild?: Build
): Promise<void> {
  if (env === "dev") {
    const count = await prisma.build.count({
      where: { projectId, isDev: true },
    });

    if (count > 0) {
      throw new Error("Dev build already exists");
    }

    const pages =
      sourceBuild === undefined
        ? await createPages()
        : await clonePages(sourceBuild.pages);

    await prisma.build.create({
      data: {
        projectId,
        pages: JSON.stringify(pages),
        isDev: true,
        isProd: false,
      },
    });

    return;
  }

  if (sourceBuild === undefined) {
    throw new Error("Source build required");
  }

  const pages = await clonePages(sourceBuild.pages);

  const build = await prisma.build.create({
    data: {
      projectId,
      pages: JSON.stringify(pages),
      isDev: false,
      isProd: false,
    },
  });

  await prisma.$transaction([
    prisma.build.updateMany({
      where: { projectId: projectId, isProd: true },
      data: { isProd: false },
    }),
    prisma.build.update({ where: { id: build.id }, data: { isProd: true } }),
  ]);
}
