/* eslint no-console: ["error", { allow: ["time", "timeEnd"] }] */

import { nanoid } from "nanoid";
import { prisma, Prisma } from "@webstudio-is/prisma-client";
import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import {
  type Deployment,
  type Resource,
  type StyleSource,
  type Prop,
  type DataSource,
  type Instance,
  type Breakpoint,
  Pages,
  initialBreakpoints,
} from "@webstudio-is/sdk";
import type { Data } from "@webstudio-is/http-client";
import type { Build } from "../types";
import { parseStyles } from "./styles";
import { parseStyleSourceSelections } from "./style-source-selections";
import { parseDeployment, serializeDeployment } from "./deployment";
import { parsePages, serializePages } from "./pages";
import { createDefaultPages } from "../shared/pages-utils";
import type { MarketplaceProduct } from "..";
import { z } from "zod";
import type { Database } from "@webstudio-is/postrest/index.server";

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

export const parseConfig = <Type>(string: string): Type => {
  return JSON.parse(string);
};

export const serializeConfig = <Type>(data: Type) => {
  return JSON.stringify(data);
};

const parseBuild = async (
  build: Database["public"]["Tables"]["Build"]["Row"]
): Promise<Build> => {
  console.time("parseBuild");
  try {
    const pages = parsePages(build.pages);
    const styles = Array.from(parseStyles(build.styles));
    const styleSourceSelections = Array.from(
      parseStyleSourceSelections(build.styleSourceSelections)
    );
    const deployment = parseDeployment(build.deployment);

    const result: Build = {
      id: build.id,
      projectId: build.projectId,
      version: build.version,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      pages,
      breakpoints: Array.from(parseData<Breakpoint>(build.breakpoints)),
      styles,
      styleSources: Array.from(parseData<StyleSource>(build.styleSources)),
      styleSourceSelections,
      props: Array.from(parseData<Prop>(build.props)),
      dataSources: Array.from(parseData<DataSource>(build.dataSources)),
      resources: Array.from(parseData<Resource>(build.resources)),
      instances: Array.from(parseData<Instance>(build.instances)),
      deployment,
      marketplaceProduct: parseConfig<MarketplaceProduct>(
        build.marketplaceProduct
      ),
    } satisfies Data["build"] & { marketplaceProduct: MarketplaceProduct };
    return result;
  } finally {
    console.timeEnd("parseBuild");
  }
};

export const loadRawBuildById = async (
  context: AppContext,
  id: Build["id"]
) => {
  const build = await context.postgrest.client
    .from("Build")
    .select("*")
    .eq("id", id)
    .single();

  if (build.error) {
    throw build.error;
  }

  return build.data;
};

export const loadBuildById = async (
  context: AppContext,
  id: Build["id"]
): Promise<Build> => {
  const build = await loadRawBuildById(context, id);

  return parseBuild(build);
};

export const loadBuildIdAndVersionByProjectId = async (
  context: AppContext,
  projectId: Build["projectId"]
): Promise<{ id: string; version: number }> => {
  const build = await context.postgrest.client
    .from("Build")
    .select("id,version")
    .eq("projectId", projectId)
    .is("deployment", null)
    .single();

  if (build.error) {
    throw build.error;
  }

  return build.data;
};

export const loadBuildByProjectId = async (
  context: AppContext,
  projectId: Build["projectId"]
): Promise<Build> => {
  const build = await context.postgrest.client
    .from("Build")
    .select("*")
    .eq("projectId", projectId)
    .is("deployment", null)
    .single();

  if (build.error) {
    throw build.error;
  }

  return parseBuild(build.data);
};

export const loadApprovedProdBuildByProjectId = async (
  projectId: Build["projectId"]
): Promise<Build> => {
  const projectData = await prisma.project.findUnique({
    where: {
      marketplaceApprovalStatus: "APPROVED",
      id_isDeleted: { id: projectId, isDeleted: false },
    },
    select: {
      latestBuild: {
        select: {
          build: true,
        },
      },
    },
  });

  const build = projectData?.latestBuild?.build;
  if (build === undefined) {
    throw new Error("Prod build not found");
  }

  return parseBuild({
    ...build,
    createdAt: build.createdAt.toISOString(),
    updatedAt: build.updatedAt.toISOString(),
  });
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

const createInitialBreakpoints = (): [Breakpoint["id"], Breakpoint][] => {
  return initialBreakpoints.map((breakpoint) => {
    const id = nanoid();
    return [
      id,
      {
        ...breakpoint,
        id,
      },
    ];
  });
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
  const systemDataSource: DataSource = {
    id: nanoid(),
    scopeInstanceId: rootInstanceId,
    name: "system",
    type: "parameter",
  };

  const defaultPages = Pages.parse(
    createDefaultPages({
      rootInstanceId,
      systemDataSourceId: systemDataSource.id,
    })
  );

  await client.build.create({
    data: {
      projectId: props.projectId,
      pages: serializePages(defaultPages),
      breakpoints: serializeData<Breakpoint>(
        new Map(createInitialBreakpoints())
      ),
      instances: serializeData<Instance>(new Map(newInstances)),
      dataSources: serializeData<DataSource>(
        new Map([[systemDataSource.id, systemDataSource]])
      ),
    },
  });
};

const zBuildCloneResult = z
  .array(z.object({ id: z.string() }))
  .length(1)
  .transform((result) => result[0]);

const cloneBuild = async (
  props: {
    fromProjectId: Build["projectId"];
    toProjectId: Build["projectId"];
    deployment: Deployment | undefined;
  },
  _context: AppContext,
  client: Prisma.TransactionClient
): Promise<{ id: string }> => {
  const deployment = props.deployment
    ? serializeDeployment(props.deployment)
    : null;

  const notCopiedFields = [
    "id",
    "createdAt",
    "updatedAt",
    "deployment",
    "projectId",
  ];
  const fieldsToCopy = Object.keys(client.build.fields)
    .filter((field) => notCopiedFields.includes(field) === false)
    .map((field) => `"${field}"`)
    .join(", ");

  const selectQuery = Prisma.sql`
    SELECT ${Prisma.raw(
      fieldsToCopy
    )}, uuid_generate_v4() as id, ${deployment} as deployment, ${
      props.toProjectId
    } as "projectId"
    FROM "Build"
    WHERE "projectId" = ${props.fromProjectId} AND "deployment" IS NULL`;

  const insertQuery = Prisma.sql`
    INSERT INTO "Build"(${Prisma.raw(
      fieldsToCopy
    )}, "id", "deployment", "projectId")
    ${selectQuery}
    RETURNING "id"`;

  const rawResult = await client.$queryRaw(insertQuery);

  const result = zBuildCloneResult.parse(rawResult);

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

  return await cloneBuild(
    {
      fromProjectId: props.projectId,
      toProjectId: props.projectId,
      deployment: props.deployment,
    },
    context,
    prisma
  );
};
