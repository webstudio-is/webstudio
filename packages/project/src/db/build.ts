import { v4 as uuid } from "uuid";
import { prisma, Build as DbBuild, Prisma } from "@webstudio-is/prisma-client";
import { db as designTokensDb } from "@webstudio-is/design-tokens/server";
import * as db from ".";
import { Build, Page, Pages } from "./schema";
import * as pagesUtils from "../shared/pages";

export const parseBuild = (build: DbBuild): Build => {
  const pages = Pages.parse(JSON.parse(build.pages));
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
    return;
  }

  return parseBuild(build);
}

const updatePages = async (
  buildId: Build["id"],
  updater: (currentPages: Pages) => Promise<Pages>
) => {
  const build = await loadById(buildId);
  const updatedPages = Pages.parse(await updater(build.pages));
  const updatedBuild = await prisma.build.update({
    where: { id: buildId },
    data: { pages: JSON.stringify(updatedPages) },
  });
  return parseBuild(updatedBuild);
};

export const addPage = async (
  buildId: Build["id"],
  data: Pick<Page, "name" | "path"> &
    Partial<Omit<Page, "id" | "treeId" | "name" | "path">>
) => {
  return updatePages(buildId, async (currentPages) => {
    const tree = await db.tree.create(db.tree.createTree());

    return {
      homePage: currentPages.homePage,
      pages: [
        ...currentPages.pages,
        {
          id: uuid(),
          treeId: tree.id,
          name: data.name,
          path: data.path,
          title: data.title ?? data.name,
          meta: data.meta ?? {},
        },
      ],
    };
  });
};

export const editPage = async (
  buildId: Build["id"],
  pageId: Page["id"],
  data: Partial<Omit<Page, "id" | "treeId">>
) => {
  return updatePages(buildId, async (currentPages) => {
    const currentPage = pagesUtils.findByIdOrPath(currentPages, pageId);
    if (currentPage === undefined) {
      throw new Error(`Page with id "${pageId}" not found`);
    }

    const updatedPage: Page = {
      id: currentPage.id,
      treeId: currentPage.treeId,
      name: data.name ?? currentPage.name,
      path: data.path ?? currentPage.path,
      title: data.title ?? currentPage.title,
      meta: { ...currentPage.meta, ...data.meta },
    };

    return {
      homePage:
        updatedPage.id === currentPages.homePage.id
          ? updatedPage
          : currentPages.homePage,
      pages: currentPages.pages.map((page) =>
        page.id === updatedPage.id ? updatedPage : page
      ),
    };
  });
};

export const deletePage = async (buildId: Build["id"], pageId: Page["id"]) => {
  return updatePages(buildId, async (currentPages) => {
    if (pageId === currentPages.homePage.id) {
      throw new Error("Cannot delete home page");
    }

    const page = pagesUtils.findByIdOrPath(currentPages, pageId);
    if (page === undefined) {
      throw new Error(`Page with id "${pageId}" not found`);
    }

    await db.tree.deleteById(page.treeId);

    return {
      homePage: currentPages.homePage,
      pages: currentPages.pages.filter((page) => page.id !== pageId),
    };
  });
};

const createPages = async (client: Prisma.TransactionClient = prisma) => {
  const tree = await db.tree.create(db.tree.createTree(), client);
  return Pages.parse({
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

const clonePage = async (
  source: Page,
  client: Prisma.TransactionClient = prisma
) => {
  const treeId = source.treeId;
  const tree = await db.tree.clone(treeId, client);
  return { ...source, id: uuid(), treeId: tree.id };
};

const clonePages = async (
  source: Pages,
  client: Prisma.TransactionClient = prisma
) => {
  const clones = [];
  for (const page of source.pages) {
    clones.push(await clonePage(page, client));
  }
  return Pages.parse({
    homePage: await clonePage(source.homePage, client),
    pages: clones,
  });
};

/*
 * We create "dev" build in two cases:
 *   1. when we create a new project
 *   2. when we clone a project
 * We create "prod" build when we publish a dev build.
 */
export async function create(
  projectId: Build["projectId"],
  env: "prod",
  sourceBuild: Build | undefined,
  client: Prisma.TransactionClient
): Promise<void>;
export async function create(
  projectId: Build["projectId"],
  env: "dev",
  sourceBuild: Build | undefined,
  client: Prisma.TransactionClient
): Promise<void>;
// eslint-disable-next-line func-style
export async function create(
  projectId: Build["projectId"],
  env: "dev" | "prod",
  sourceBuild: Build | undefined,
  client: Prisma.TransactionClient
): Promise<void> {
  if (env === "dev") {
    const count = await client.build.count({
      where: { projectId, isDev: true },
    });

    if (count > 0) {
      throw new Error("Dev build already exists");
    }
  }

  if (env === "prod" && sourceBuild === undefined) {
    throw new Error("Source build required for production build");
  }

  const breakpointsValues = sourceBuild
    ? (await db.breakpoints.load(sourceBuild.id)).values
    : db.breakpoints.createValues();

  const pages =
    sourceBuild === undefined
      ? await createPages(client)
      : await clonePages(sourceBuild.pages, client);

  if (env === "prod") {
    await client.build.updateMany({
      where: { projectId: projectId, isProd: true },
      data: { isProd: false },
    });
  }

  const build = await client.build.create({
    data: {
      projectId,
      pages: JSON.stringify(pages),
      isDev: env === "dev",
      isProd: env === "prod",
    },
  });

  await db.breakpoints.create(build.id, breakpointsValues, client);
  if (sourceBuild) {
    await designTokensDb.clone(sourceBuild.id, build.id, client);
  }
}
