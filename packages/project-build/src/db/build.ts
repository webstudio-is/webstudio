import { nanoid } from "nanoid";
import {
  prisma,
  Build as DbBuild,
  Prisma,
  Project,
} from "@webstudio-is/prisma-client";
import type { AppContext } from "@webstudio-is/trpc-interface";
import type { Build } from "../types";
import { Pages } from "../schema/pages";
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
