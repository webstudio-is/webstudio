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
import { findCycles } from "../shared/graph-utils";

const parseCompactData = <Item>(serialized: string) =>
  JSON.parse(serialized) as Item[];

const parseCompactInstanceData = (serialized: string) => {
  const instances = JSON.parse(serialized) as Instance[];
  const cycles = findCycles(instances);
  if (cycles.length === 0) {
    return instances;
  }
  // eslint-disable-next-line no-console
  console.error("Cycles detected in instance data", cycles);

  const cycleInstances = new Map<Instance["id"], Instance>();
  const cycleInstanceIdSet = new Set<Instance["id"]>(cycles.flat());

  // Pick all instances that are part of the cycle
  for (const instance of instances) {
    if (cycleInstanceIdSet.has(instance.id)) {
      cycleInstances.set(instance.id, instance);
    }
  }

  for (const cycle of cycles) {
    // Find slot or take last instance
    const slotId =
      cycle.find((id) => cycleInstances.get(id)?.component === "Slot") ??
      cycle[cycle.length - 1];

    // Remove slot from children of all instances in the cycle
    for (const id of cycle) {
      const instance = cycleInstances.get(id);
      if (instance === undefined) {
        continue;
      }

      instance.children = instance.children.filter(
        (child) => child.value !== slotId
      );
    }
  }

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
