import { prisma, Build as DbBuild } from "@webstudio-is/prisma-client";
import { type Breakpoint } from "@webstudio-is/react-sdk";
import { v4 as uuid } from "uuid";
import * as db from ".";
import { Build, Page, Pages, PagesSchema } from "./types";

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

export const addPage = async (
  buildId: Build["id"],
  data: { name: string; path: string }
) => {
  const build = await loadById(buildId);

  const breakpoints = await db.breakpoints.load(buildId);
  const tree = await db.tree.create(
    db.tree.createRootInstance(breakpoints.values)
  );

  const nextPages = PagesSchema.parse({
    homePage: build.pages.homePage,
    pages: [
      ...build.pages.pages,
      {
        id: uuid(),
        name: data.name,
        path: data.path,
        title: data.name,
        meta: {},
        treeId: tree.id,
      },
    ],
  });

  const newBuild = await prisma.build.update({
    where: { id: buildId },
    data: { pages: JSON.stringify(nextPages) },
  });

  return parseBuild(newBuild);
};

const createPages = async (breakpoints: Array<Breakpoint>) => {
  const tree = await db.tree.create(db.tree.createRootInstance(breakpoints));
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

const clonePage = async (source: Page) => {
  const treeId = source.treeId;

  const tree = await db.tree.clone(treeId);
  await db.props.clone({ previousTreeId: treeId, nextTreeId: tree.id });

  return { ...source, id: uuid(), treeId: tree.id };
};

const clonePages = async (source: Pages) => {
  const clones = [];
  for (const page of source.pages) {
    clones.push(await clonePage(page));
  }
  return PagesSchema.parse({
    homePage: await clonePage(source.homePage),
    pages: clones,
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

    const breakpointsValues = sourceBuild
      ? (await db.breakpoints.load(sourceBuild.id)).values
      : db.breakpoints.createValues();

    const pages =
      sourceBuild === undefined
        ? await createPages(breakpointsValues)
        : await clonePages(sourceBuild.pages);

    const build = await prisma.build.create({
      data: {
        projectId,
        pages: JSON.stringify(pages),
        isDev: true,
        isProd: false,
      },
    });

    await db.breakpoints.create(build.id, breakpointsValues);

    return;
  }

  if (sourceBuild === undefined) {
    throw new Error("Source build required");
  }

  const breakpointsValues = (await db.breakpoints.load(sourceBuild.id)).values;

  const pages = await clonePages(sourceBuild.pages);

  const [, build] = await prisma.$transaction([
    prisma.build.updateMany({
      where: { projectId: projectId, isProd: true },
      data: { isProd: false },
    }),
    prisma.build.create({
      data: {
        projectId,
        pages: JSON.stringify(pages),
        isDev: false,
        isProd: true,
      },
    }),
  ]);

  await db.breakpoints.create(build.id, breakpointsValues);
}
