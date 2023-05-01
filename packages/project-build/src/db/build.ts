/* eslint no-console: ["error", { allow: ["time", "timeEnd"] }] */

import { nanoid } from "nanoid";
import {
  type Build as DbBuild,
  prisma,
  Prisma,
} from "@webstudio-is/prisma-client";
import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
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
  // Hardcode skipValidation to true for now
  const skipValidation = true;
  // eslint-disable-next-line no-console
  console.time("parseBuild");
  try {
    const pages = skipValidation
      ? (JSON.parse(build.pages) as Pages)
      : Pages.parse(JSON.parse(build.pages));

    const breakpoints = Array.from(
      parseBreakpoints(build.breakpoints, skipValidation)
    );
    const styles = Array.from(parseStyles(build.styles, skipValidation));
    const styleSources = Array.from(
      parseStyleSources(build.styleSources, skipValidation)
    );
    const styleSourceSelections = Array.from(
      parseStyleSourceSelections(build.styleSourceSelections, skipValidation)
    );
    const props = Array.from(parseProps(build.props, skipValidation));
    const instances = Array.from(
      parseInstances(build.instances, skipValidation)
    );

    return {
      id: build.id,
      projectId: build.projectId,
      isDev: build.isDev,
      isProd: build.isProd,
      createdAt: build.createdAt.toISOString(),
      pages,
      breakpoints,
      styles,
      styleSources,
      styleSourceSelections,
      props,
      instances,
    };
  } finally {
    // eslint-disable-next-line no-console
    console.timeEnd("parseBuild");
  }
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

export const createProductionBuild = async (
  props: {
    projectId: Build["projectId"];
  },
  context: AppContext
) => {
  const canBuild = await authorizeProject.hasProjectPermit(
    { projectId: props.projectId, permit: "build" },
    context
  );

  if (canBuild === false) {
    throw new AuthorizationError("You don't have access to build this project");
  }

  // @todo: This is highly unoptimal and on a big project would take few seconds of CPU time.
  // we need just duplicate row from dev build and change isDev to false and isProd to true
  const devBuild = await loadBuildByProjectId(props.projectId, "dev");

  await prisma.$transaction(async (client) => {
    await createBuild(
      { projectId: props.projectId, env: "prod", sourceBuild: devBuild },
      context,
      client
    );
  });
};
