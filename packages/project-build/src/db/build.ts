/* eslint no-console: ["error", { allow: ["time", "timeEnd"] }] */

import { nanoid } from "nanoid";
import type { Database } from "@webstudio-is/postrest/index.server";
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
  StyleSourceSelection,
  StyleDecl,
} from "@webstudio-is/sdk";
import type { Data } from "@webstudio-is/http-client";
import type { Build, CompactBuild } from "../types";
import { parseStyles } from "./styles";
import { parseStyleSourceSelections } from "./style-source-selections";
import { parseDeployment } from "./deployment";
import { parsePages, serializePages } from "./pages";
import { createDefaultPages } from "../shared/pages-utils";
import type { MarketplaceProduct } from "../shared//marketplace";

const parseCompactData = <Item>(serialized: string) =>
  JSON.parse(serialized) as Item[];

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

const parseCompactBuild = async (
  build: Database["public"]["Tables"]["Build"]["Row"]
) => {
  try {
    return {
      id: build.id,
      projectId: build.projectId,
      version: build.version,
      createdAt: build.createdAt,
      updatedAt: build.updatedAt,
      pages: parseConfig<Pages>(build.pages),
      breakpoints: parseCompactData<Breakpoint>(build.breakpoints),
      styles: parseCompactData<StyleDecl>(build.styles),
      styleSources: parseCompactData<StyleSource>(build.styleSources),
      styleSourceSelections: parseCompactData<StyleSourceSelection>(
        build.styleSourceSelections
      ),
      props: parseCompactData<Prop>(build.props),
      dataSources: parseCompactData<DataSource>(build.dataSources),
      resources: parseCompactData<Resource>(build.resources),
      instances: parseCompactData<Instance>(build.instances),
      deployment: parseDeployment(build.deployment),
      marketplaceProduct: parseConfig<MarketplaceProduct>(
        build.marketplaceProduct
      ),
    } satisfies CompactBuild;
  } finally {
    // empty block
  }
};

export const loadRawBuildById = async (
  context: AppContext,
  id: Build["id"]
) => {
  const build = await context.postgrest.client
    .from("Build")
    .select("*")
    .eq("id", id);
  // .single(); Note: Single response is not compressed. Uncomment the following line once the issue is resolved: https://github.com/orgs/supabase/discussions/28757

  if (build.error) {
    throw build.error;
  }

  if (build.data.length !== 1) {
    throw new Error(
      `Results contain ${build.data.length} row(s) requires 1 row`
    );
  }

  return build.data[0];
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
    .is("deployment", null);
  // .single(); Note: Single response is not compressed. Uncomment the following line once the issue is resolved: https://github.com/orgs/supabase/discussions/28757

  if (build.error) {
    throw build.error;
  }

  if (build.data.length !== 1) {
    throw new Error(
      `Results contain ${build.data.length} row(s) requires 1 row`
    );
  }

  return build.data[0];
};

const loadRawBuildByProjectId = async (
  context: AppContext,
  projectId: Build["projectId"]
) => {
  const build = await context.postgrest.client
    .from("Build")
    .select("*")
    .eq("projectId", projectId)
    .is("deployment", null);
  // .single(); Note: Single response is not compressed. Uncomment the following line once the issue is resolved: https://github.com/orgs/supabase/discussions/28757

  if (build.error) {
    throw build.error;
  }

  if (build.data.length !== 1) {
    throw new Error(
      `Results contain ${build.data.length} row(s) requires 1 row`
    );
  }

  return build.data[0];
};

export const loadBuildByProjectId = async (
  context: AppContext,
  projectId: Build["projectId"]
): Promise<Build> => {
  const build = await loadRawBuildByProjectId(context, projectId);
  return parseBuild(build);
};

export const loadDevBuildByProjectId = async (
  context: AppContext,
  projectId: Build["projectId"]
) => {
  const build = await loadRawBuildByProjectId(context, projectId);
  return parseCompactBuild(build);
};

export const loadApprovedProdBuildByProjectId = async (
  context: AppContext,
  projectId: Build["projectId"]
) => {
  const latestBuild = await context.postgrest.client
    .from("LatestBuildPerProject")
    .select(
      `
        buildId,
        project:Project!inner (id)
      `
    )
    .eq("projectId", projectId)
    .eq("isLatestBuild", true)
    .eq("project.isDeleted", false)
    .eq("project.marketplaceApprovalStatus", "APPROVED")
    .single();
  if (latestBuild.error) {
    throw latestBuild.error;
  }
  if (latestBuild.data.buildId === null) {
    throw Error("Build not found");
  }
  const build = await context.postgrest.client
    .from("Build")
    .select()
    .eq("id", latestBuild.data.buildId);
  // .single(); Note: Single response is not compressed. Uncomment the following line once the issue is resolved: https://github.com/orgs/supabase/discussions/28757

  if (build.error) {
    throw build.error;
  }

  if (build.data.length !== 1) {
    throw new Error(
      `Results contain ${build.data.length} row(s) requires 1 row`
    );
  }

  return parseCompactBuild(build.data[0]);
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
  context: AppContext
): Promise<void> => {
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

  const newBuild = await context.postgrest.client.from("Build").insert({
    id: crypto.randomUUID(),
    projectId: props.projectId,
    pages: serializePages(defaultPages),
    breakpoints: serializeData<Breakpoint>(new Map(createInitialBreakpoints())),
    instances: serializeData<Instance>(new Map(newInstances)),
    dataSources: serializeData<DataSource>(
      new Map([[systemDataSource.id, systemDataSource]])
    ),
  });
  if (newBuild.error) {
    throw newBuild.error;
  }
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

  const build = await context.postgrest.client.rpc("create_production_build", {
    project_id: props.projectId,
    deployment: JSON.stringify(props.deployment),
  });
  const buildId = build.data;
  if (build.error) {
    throw build.error;
  }
  if (buildId === null) {
    throw Error(`Project ${props.projectId} not found`);
  }

  return {
    id: build.data,
  };
};
