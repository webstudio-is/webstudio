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
import { Pages, type Deployment, Resource } from "@webstudio-is/sdk";
import {
  createInitialBreakpoints,
  parseBreakpoints,
  serializeBreakpoints,
} from "./__DEPRECATED__/breakpoints";
import { parseStyles } from "./styles";
import { parseStyleSources } from "./__DEPRECATED__/style-sources";
import { parseStyleSourceSelections } from "./style-source-selections";
import { parseProps } from "./__DEPRECATED__/props";
import { parseDataSources } from "./__DEPRECATED__/data-sources";
import { parseInstances, serializeInstances } from "./__DEPRECATED__/instances";
import { parseDeployment, serializeDeployment } from "./deployment";
import type { Data } from "@webstudio-is/http-client";
import { parsePages, serializePages } from "./__DEPRECATED__/pages";
import { createDefaultPages } from "../shared/pages-utils";

export const parseData = <Type extends { id: string }>(
  string: string
): Map<Type["id"], Type> => {
  const list = JSON.parse(string) as Type[];
  return new Map(list.map((item) => [item.id, item]));
};

export const serializeData = <Type extends { id: string }>(
  data: Map<Type["id"], Type>
) => {
  const dataSourcesList: Type[] = Array.from(data.values());
  return JSON.stringify(dataSourcesList);
};

const parseBuild = async (build: DbBuild): Promise<Build> => {
  // eslint-disable-next-line no-console
  console.time("parseBuild");
  try {
    const pages = parsePages(build.pages);
    const breakpoints = Array.from(parseBreakpoints(build.breakpoints));
    const styles = Array.from(parseStyles(build.styles));
    const styleSources = Array.from(parseStyleSources(build.styleSources));
    const styleSourceSelections = Array.from(
      parseStyleSourceSelections(build.styleSourceSelections)
    );
    const props = Array.from(parseProps(build.props));
    const dataSources = Array.from(parseDataSources(build.dataSources));
    const instances = Array.from(parseInstances(build.instances));

    const deployment = parseDeployment(build.deployment);

    const result: Build = {
      id: build.id,
      projectId: build.projectId,
      version: build.version,
      createdAt: build.createdAt.toISOString(),
      updatedAt: build.updatedAt.toISOString(),
      pages,
      breakpoints,
      styles,
      styleSources,
      styleSourceSelections,
      props,
      dataSources,
      resources: Array.from(parseData<Resource>(build.resources)),
      instances,
      deployment,
    } satisfies Data["build"];

    return result;
  } finally {
    // eslint-disable-next-line no-console
    console.timeEnd("parseBuild");
  }
};

export const loadBuildById = async (
  id: Build["id"]
): Promise<Build | undefined> => {
  const build = await prisma.build.findUnique({
    where: { id },
  });

  if (build === null) {
    return;
  }

  return parseBuild(build);
};

export const loadBuildByProjectId = async (
  projectId: Build["projectId"]
): Promise<Build> => {
  const build = await prisma.build.findFirst({
    where: { projectId, deployment: null },
  });

  if (build === null) {
    throw new Error("Dev build not found");
  }

  return parseBuild(build);
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

/*
 * We create "dev" build in two cases:
 *   1. when we create a new project
 *   2. when we clone a project
 * We create "prod" build when we publish a dev build.
 */
export const createBuild = async (
  props: {
    projectId: Build["projectId"];
  },
  _context: AppContext,
  client: Prisma.TransactionClient
): Promise<void> => {
  const count = await client.build.count({
    where: { projectId: props.projectId, deployment: null },
  });

  if (count > 0) {
    throw new Error("Dev build already exists");
  }

  const newInstances = createNewPageInstances();
  const [rootInstanceId] = newInstances[0];

  const defaultPages = Pages.parse(createDefaultPages({ rootInstanceId }));

  await client.build.create({
    data: {
      projectId: props.projectId,
      pages: serializePages(defaultPages),
      breakpoints: serializeBreakpoints(new Map(createInitialBreakpoints())),
      instances: serializeInstances(new Map(newInstances)),
    },
  });
};

export const cloneBuild = async (
  props: {
    fromProjectId: Build["projectId"];
    toProjectId: Build["projectId"];
    deployment: Deployment | undefined;
  },
  _context: AppContext,
  client: Prisma.TransactionClient
) => {
  const build = await prisma.build.findFirst({
    where: { projectId: props.fromProjectId, deployment: null },
  });

  if (build === null) {
    throw new Error("Dev build not found");
  }

  const data = {
    ...build,
    id: undefined,
    createdAt: undefined,
    updatedAt: undefined,
    deployment: props.deployment
      ? serializeDeployment(props.deployment)
      : undefined,
    projectId: props.toProjectId,
  };

  const result = await client.build.create({
    data,
    select: {
      id: true,
    },
  });

  return result;
};

export const createProductionBuild = async (
  props: {
    projectId: Build["projectId"];
    deployment: Deployment;
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

  return await prisma.$transaction(async (client) => {
    return await cloneBuild(
      {
        fromProjectId: props.projectId,
        toProjectId: props.projectId,
        deployment: props.deployment,
      },
      context,
      client
    );
  });
};
