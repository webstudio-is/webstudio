/* eslint no-console: ["error", { allow: ["time", "timeEnd"] }] */

import { nanoid } from "nanoid";
import type { Database } from "@webstudio-is/postrest/index.server";
import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { db as authDb } from "@webstudio-is/authorization-token/index.server";
import {
  type Deployment,
  type Resource,
  type StyleSource,
  type Prop,
  type DataSource,
  type Instance,
  type Breakpoint,
  type StyleSourceSelection,
  type StyleDecl,
  Pages,
  initialBreakpoints,
} from "@webstudio-is/sdk";
import type { Build, CompactBuild } from "../types";
import { parseDeployment } from "./deployment";
import { serializePages } from "./pages";
import { createDefaultPages } from "../shared/pages-utils";
import type { MarketplaceProduct } from "../shared//marketplace";
import { breakCyclesMutable } from "../shared/graph-utils";

const parseCompactData = <Item>(serialized: string) =>
  JSON.parse(serialized) as Item[];

const parseCompactInstanceData = (serialized: string) => {
  const instances = JSON.parse(serialized) as Instance[];

  // @todo: Remove after measurements on real data
  console.time("breakCyclesMutable");
  breakCyclesMutable(instances, (node) => node.component === "Slot");
  console.timeEnd("breakCyclesMutable");

  return instances;
};

export const parseData = <Type extends { id: string }>(
  string: string
): Map<Type["id"], Type> => {
  const list = JSON.parse(string) as Type[];
  return new Map(list.map((item) => [item.id, item]));
};

export const parseInstanceData = (
  string: string
): Map<Instance["id"], Instance> => {
  const list = parseCompactInstanceData(string);
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
      instances: parseCompactInstanceData(build.instances),
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

export const loadBuildById = async (context: AppContext, id: Build["id"]) => {
  const build = await loadRawBuildById(context, id);

  return parseCompactBuild(build);
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

export const loadDevBuildByProjectId = async (
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

  return parseCompactBuild(build.data[0]);
};

export const loadApprovedProdBuildByProjectId = async (
  context: AppContext,
  projectId: Build["projectId"]
) => {
  const project = await context.postgrest.client
    .from("Project")
    .select(
      `
        id,
        latestBuildVirtual(buildId)
      `
    )
    .eq("id", projectId)
    .eq("isDeleted", false)
    .eq("marketplaceApprovalStatus", "APPROVED")
    .single();
  if (project.error) {
    throw project.error;
  }
  if (project.data.latestBuildVirtual === null) {
    throw Error("Build not found");
  }

  const build = await context.postgrest.client
    .from("Build")
    .select()
    .eq("id", project.data.latestBuildVirtual.buildId);
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
  const defaultPages = createDefaultPages({ rootInstanceId });

  const newBuild = await context.postgrest.client.from("Build").insert({
    id: crypto.randomUUID(),
    projectId: props.projectId,
    pages: serializePages(defaultPages),
    breakpoints: serializeData<Breakpoint>(new Map(createInitialBreakpoints())),
    instances: serializeData<Instance>(new Map(newInstances)),
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
    { projectId: props.projectId, permit: "edit" },
    context
  );

  if (canBuild === false) {
    throw new AuthorizationError("You don't have access to build this project");
  }

  // Get token permissions
  if (context.authorization.type === "token") {
    const permissions = await authDb.getTokenPermissions(
      {
        projectId: props.projectId,
        token: context.authorization.authToken,
      },
      context
    );

    if (!permissions.canPublish) {
      throw new AuthorizationError(
        "The token does not have permission to build this project."
      );
    }
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
