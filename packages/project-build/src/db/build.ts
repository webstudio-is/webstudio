import { nanoid } from "nanoid";
import {
  prisma,
  Build as DbBuild,
  Prisma,
  Project,
} from "@webstudio-is/prisma-client";
import type { AppContext } from "@webstudio-is/trpc-interface";
import { findPageByIdOrPath } from "../shared/pages-utils";
import type { Build } from "../types";
import { type Page, Pages } from "../schema/pages";
import {
  createInitialBreakpoints,
  parseBreakpoints,
  serializeBreakpoints,
} from "./breakpoints";
import { parseStyles, serializeStyles } from "./styles";
import { parseStyleSources, serializeStyleSources } from "./style-sources";
import {
  parseStyleSourceSelections,
  serializeStyleSourceSelections,
} from "./style-source-selections";
import { parseProps, serializeProps } from "./props";
import { parseInstances, serializeInstances } from "./instances";

const parseBuild = async (build: DbBuild): Promise<Build> => {
  const pages = Pages.parse(JSON.parse(build.pages));
  return {
    id: build.id,
    projectId: build.projectId,
    isDev: build.isDev,
    isProd: build.isProd,
    createdAt: build.createdAt.toISOString(),
    pages,
    breakpoints: Array.from(parseBreakpoints(build.breakpoints)),
    styles: Array.from(await parseStyles(build.projectId, build.styles)),
    styleSources: Array.from(parseStyleSources(build.styleSources)),
    styleSourceSelections: Array.from(
      parseStyleSourceSelections(build.styleSourceSelections)
    ),
    props: Array.from(parseProps(build.props)),
    instances: Array.from(parseInstances(build.instances)),
  };
};

export const loadBuildById = async ({
  projectId,
  buildId,
}: {
  projectId: Project["id"];
  buildId: Build["id"];
}): Promise<Build> => {
  const build = await prisma.build.findUnique({
    where: {
      id_projectId: { projectId, id: buildId },
    },
  });

  if (build === null) {
    throw new Error("Build not found");
  }

  return parseBuild(build);
};

export async function loadBuildByProjectId(
  projectId: Build["projectId"],
  env: "dev"
): Promise<Build>;
export async function loadBuildByProjectId(
  projectId: Build["projectId"],
  env: "prod"
): Promise<Build | undefined>;
// eslint-disable-next-line func-style
export async function loadBuildByProjectId(
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
  { projectId, buildId }: { projectId: Project["id"]; buildId: Build["id"] },
  updater: (currentPages: Pages) => Promise<Pages>
) => {
  const build = await loadBuildById({ projectId, buildId });
  const updatedPages = Pages.parse(await updater(build.pages));
  const updatedBuild = await prisma.build.update({
    where: {
      id_projectId: { projectId, id: buildId },
    },
    data: {
      pages: JSON.stringify(updatedPages),
    },
  });
  return parseBuild(updatedBuild);
};

const createNewPageInstances = (): Build["instances"] => {
  const instanceId = nanoid();
  return [
    [
      instanceId,
      {
        type: "instance",
        id: instanceId,
        component: "Body",
        children: [],
      },
    ],
  ];
};

export const addPage = async ({
  projectId,
  buildId,
  data,
}: {
  projectId: Project["id"];
  buildId: Build["id"];
  data: Pick<Page, "name" | "path"> &
    Partial<Omit<Page, "id" | "name" | "path">>;
}) => {
  const build = await loadBuildById({ projectId, buildId });
  const currentPages = build.pages;
  const currentInstances = build.instances;

  const instances = createNewPageInstances();
  const [rootInstanceId] = instances[0];

  const updatedPages = Pages.parse({
    homePage: currentPages.homePage,
    pages: [
      ...currentPages.pages,
      {
        id: nanoid(),
        rootInstanceId,
        name: data.name,
        path: data.path,
        title: data.title ?? data.name,
        meta: data.meta ?? {},
      },
    ],
  } satisfies Pages);

  const updatedBuild = await prisma.build.update({
    where: {
      id_projectId: { projectId, id: buildId },
    },
    data: {
      pages: JSON.stringify(updatedPages),
      instances: serializeInstances(
        new Map([...currentInstances, ...instances])
      ),
    },
  });
  return parseBuild(updatedBuild);
};

export const editPage = async ({
  projectId,
  buildId,
  pageId,
  data,
}: {
  projectId: Project["id"];
  buildId: Build["id"];
  pageId: Page["id"];
  data: Partial<Omit<Page, "id">>;
}) => {
  return updatePages({ projectId, buildId }, async (currentPages) => {
    const currentPage = findPageByIdOrPath(currentPages, pageId);
    if (currentPage === undefined) {
      throw new Error(`Page with id "${pageId}" not found`);
    }

    const updatedPage: Page = {
      id: currentPage.id,
      rootInstanceId: currentPage.rootInstanceId,
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

export const deletePage = async ({
  projectId,
  buildId,
  pageId,
}: {
  projectId: Project["id"];
  buildId: Build["id"];
  pageId: Page["id"];
}) => {
  return updatePages({ projectId, buildId }, async (currentPages) => {
    if (pageId === currentPages.homePage.id) {
      throw new Error("Cannot delete home page");
    }

    const page = findPageByIdOrPath(currentPages, pageId);
    if (page === undefined) {
      throw new Error(`Page with id "${pageId}" not found`);
    }

    // @todo cleanup style source selections of deleted pages
    // @todo cleanup props of deleted pages
    // @todo cleanup instances of deleted pages

    return {
      homePage: currentPages.homePage,
      pages: currentPages.pages.filter((page) => page.id !== pageId),
    };
  });
};

/*
 * We create "dev" build in two cases:
 *   1. when we create a new project
 *   2. when we clone a project
 * We create "prod" build when we publish a dev build.
 */
export async function createBuild(
  props: {
    projectId: Build["projectId"];
    env: "prod";
    sourceBuild: Build | undefined;
  },
  context: AppContext,
  client: Prisma.TransactionClient
): Promise<void>;
export async function createBuild(
  props: {
    projectId: Build["projectId"];
    env: "dev";
    sourceBuild: Build | undefined;
  },
  context: AppContext,
  client: Prisma.TransactionClient
): Promise<void>;
// eslint-disable-next-line func-style
export async function createBuild(
  props: {
    projectId: Build["projectId"];
    env: "dev" | "prod";
    sourceBuild: Build | undefined;
  },
  _context: AppContext,
  client: Prisma.TransactionClient
): Promise<void> {
  if (props.env === "dev") {
    const count = await client.build.count({
      where: { projectId: props.projectId, isDev: true },
    });

    if (count > 0) {
      throw new Error("Dev build already exists");
    }
  }

  if (props.env === "prod" && props.sourceBuild === undefined) {
    throw new Error("Source build required for production build");
  }

  if (props.env === "prod") {
    await client.build.updateMany({
      where: { projectId: props.projectId, isProd: true },
      data: { isProd: false },
    });
  }

  let newInstances: Build["instances"];
  let newPages: Pages;
  if (props.sourceBuild === undefined) {
    newInstances = createNewPageInstances();
    const [rootInstanceId] = newInstances[0];
    newPages = Pages.parse({
      homePage: {
        id: nanoid(),
        name: "Home",
        path: "",
        title: "Home",
        meta: {},
        rootInstanceId,
      },
      pages: [],
    } satisfies Pages);
  } else {
    newInstances = props.sourceBuild.instances;
    newPages = props.sourceBuild.pages;
  }

  await client.build.create({
    data: {
      projectId: props.projectId,
      pages: JSON.stringify(newPages),
      breakpoints: serializeBreakpoints(
        new Map(props.sourceBuild?.breakpoints ?? createInitialBreakpoints())
      ),
      styles: serializeStyles(new Map(props.sourceBuild?.styles)),
      styleSources: serializeStyleSources(
        new Map(props.sourceBuild?.styleSources)
      ),
      styleSourceSelections: serializeStyleSourceSelections(
        new Map(props.sourceBuild?.styleSourceSelections)
      ),
      props: serializeProps(new Map(props.sourceBuild?.props)),
      instances: serializeInstances(new Map(newInstances)),
      isDev: props.env === "dev",
      isProd: props.env === "prod",
    },
  });
}
