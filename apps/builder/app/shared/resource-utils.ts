import hash from "@emotion/hash";
import { z } from "zod";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type { CompactBuild } from "@webstudio-is/project-build";
import {
  type WebstudioData,
  type Instance,
  resource,
  type DataSource,
  type Prop,
  type Resource,
  type ResourceRequest,
} from "@webstudio-is/sdk";
import { compactBuildPatchPayload } from "./build-patch-utils";
import { getExpressionErrorMessages } from "./expression-validation";
import { rebindTreeVariablesMutable } from "./data-variables";
import {
  createWebstudioDataFromBuild,
  createWebstudioDataPatchPayload,
} from "./page-utils";

type BuildPatchPayload = z.infer<typeof buildPatchTransaction>["payload"];

export const createResource = ({
  id,
  control,
  name,
  url,
  searchParams,
  method,
  headers,
  body,
}: {
  id: Resource["id"];
  control?: unknown;
  name?: unknown;
  url: unknown;
  searchParams?: unknown;
  method: unknown;
  headers: unknown;
  body?: unknown;
}): Resource =>
  resource.parse({
    id,
    control,
    name,
    url,
    searchParams,
    method,
    headers,
    // use undefined instead of empty string
    body: body || undefined,
  });

export const findResource = (
  resources: Iterable<Resource>,
  resourceId: Resource["id"]
) => {
  for (const value of resources) {
    if (value.id === resourceId) {
      return value;
    }
  }
};

export const serializeResources = ({
  resources,
  dataSources,
  scopeInstanceId,
}: {
  resources: Iterable<Resource> | Map<string, Resource>;
  dataSources: Iterable<DataSource> | Map<string, DataSource>;
  scopeInstanceId?: Instance["id"];
}) => {
  const dataSourceList =
    dataSources instanceof Map
      ? Array.from(dataSources.values())
      : Array.from(dataSources);
  return {
    resources: (resources instanceof Map
      ? Array.from(resources.values())
      : Array.from(resources)
    )
      .filter(
        (resource) =>
          scopeInstanceId === undefined ||
          dataSourceList.some(
            (dataSource) =>
              dataSource.type === "resource" &&
              dataSource.resourceId === resource.id &&
              dataSource.scopeInstanceId === scopeInstanceId
          )
      )
      .map((resource) => {
        const dataSource = dataSourceList.find(
          (dataSource) =>
            dataSource.type === "resource" &&
            dataSource.resourceId === resource.id &&
            (scopeInstanceId === undefined ||
              dataSource.scopeInstanceId === scopeInstanceId)
        );
        return {
          id: resource.id,
          name: resource.name,
          method: resource.method,
          url: resource.url,
          scopeInstanceId: dataSource?.scopeInstanceId,
          exposedAsDataSource: dataSource !== undefined,
          dataSourceId: dataSource?.id,
        };
      }),
  };
};

export const resourceFieldsInput = resource
  .omit({ id: true })
  .extend({ control: z.enum(["system", "graphql"]).optional() });

export const resourceFieldsUpdateInput = resourceFieldsInput.partial();

export const getResourceKey = (resource: ResourceRequest) => {
  try {
    return hash(
      JSON.stringify([
        // explicitly list all fields to keep hash stable
        resource.name,
        resource.method,
        resource.url,
        resource.searchParams,
        resource.headers,
        resource.body,
      ])
    );
  } catch {
    // guard from invalid resources
    return "";
  }
};

export const getResourceExpressionErrors = (
  fields: Partial<Pick<Resource, "url" | "body" | "headers" | "searchParams">>
) => {
  const errors: string[] = [];
  const validate = (name: string, expression: string | undefined) => {
    if (expression === undefined) {
      return;
    }
    for (const error of getExpressionErrorMessages({ expression })) {
      errors.push(`${name}: ${error}`);
    }
  };
  validate("url", fields.url);
  validate("body", fields.body);
  for (const [index, header] of (fields.headers ?? []).entries()) {
    validate(`headers.${index}.value`, header.value);
  }
  for (const [index, searchParam] of (fields.searchParams ?? []).entries()) {
    validate(`searchParams.${index}.value`, searchParam.value);
  }
  return errors;
};

const createResourceDataSource = ({
  dataSourceId,
  scopeInstanceId,
  name,
  resourceId,
}: {
  dataSourceId: DataSource["id"];
  scopeInstanceId: Instance["id"];
  name: DataSource["name"];
  resourceId: Resource["id"];
}): DataSource => ({
  id: dataSourceId,
  scopeInstanceId,
  name,
  type: "resource",
  resourceId,
});

export const upsertResourceMutable = ({
  data,
  resource,
  dataSourceId,
  scopeInstanceId,
  dataSourceName,
}: {
  data: Pick<
    WebstudioData,
    "instances" | "props" | "dataSources" | "resources"
  > & {
    pages: WebstudioData["pages"] | undefined;
  };
  resource: Resource;
  dataSourceId?: DataSource["id"];
  scopeInstanceId?: Instance["id"];
  dataSourceName?: DataSource["name"];
}) => {
  data.resources.set(resource.id, resource);
  if (dataSourceId !== undefined && scopeInstanceId !== undefined) {
    data.dataSources.set(
      dataSourceId,
      createResourceDataSource({
        dataSourceId,
        scopeInstanceId,
        name: dataSourceName ?? resource.name,
        resourceId: resource.id,
      })
    );
    rebindTreeVariablesMutable({
      startingInstanceId: scopeInstanceId,
      ...data,
    });
    if (data.pages !== undefined) {
      rebindTreeVariablesMutable({
        startingInstanceId: scopeInstanceId,
        ...data,
        pages: undefined,
      });
    }
  }
};

export const createResourceUpsertPatchPayload = ({
  build,
  resource,
  dataSourceId,
  scopeInstanceId,
  dataSourceName,
}: {
  build: Pick<
    CompactBuild,
    | "pages"
    | "instances"
    | "props"
    | "dataSources"
    | "resources"
    | "breakpoints"
    | "styleSources"
    | "styleSourceSelections"
    | "styles"
  >;
  resource: Resource;
  dataSourceId?: DataSource["id"];
  scopeInstanceId?: Instance["id"];
  dataSourceName?: DataSource["name"];
}) => {
  const before = createWebstudioDataFromBuild({ build });
  const after = createWebstudioDataFromBuild({ build });
  upsertResourceMutable({
    data: after,
    resource,
    dataSourceId,
    scopeInstanceId,
    dataSourceName,
  });
  return createWebstudioDataPatchPayload({ before, after });
};

export const createResourceCreatePayload = ({
  resourceId,
  resource: resourceInput,
  resources,
  dataSources,
  dataSourceId,
  scopeInstanceId,
  dataSourceName,
}: {
  resourceId: Resource["id"];
  resource: z.infer<typeof resourceFieldsInput>;
  resources: Iterable<Resource>;
  dataSources: Iterable<DataSource>;
  dataSourceId?: DataSource["id"];
  scopeInstanceId?: DataSource["scopeInstanceId"];
  dataSourceName?: DataSource["name"];
}): {
  payload: BuildPatchPayload;
  dataSourceId?: DataSource["id"];
  errors: Array<
    | { type: "duplicate-resource-id"; resourceId: Resource["id"] }
    | { type: "duplicate-data-source-id"; dataSourceId: DataSource["id"] }
  >;
} => {
  const errors = [];
  if (Array.from(resources).some((resource) => resource.id === resourceId)) {
    errors.push({ type: "duplicate-resource-id" as const, resourceId });
  }
  const nextDataSourceId =
    scopeInstanceId === undefined ? undefined : dataSourceId;
  if (
    nextDataSourceId !== undefined &&
    Array.from(dataSources).some(
      (dataSource) => dataSource.id === nextDataSourceId
    )
  ) {
    errors.push({
      type: "duplicate-data-source-id" as const,
      dataSourceId: nextDataSourceId,
    });
  }
  if (errors.length > 0) {
    return { payload: [], dataSourceId: nextDataSourceId, errors };
  }

  const resourceValue = createResource({
    id: resourceId,
    name: resourceInput.name,
    control: resourceInput.control,
    method: resourceInput.method,
    url: resourceInput.url,
    searchParams: resourceInput.searchParams,
    headers: resourceInput.headers,
    body: resourceInput.body,
  });
  const payload: BuildPatchPayload = [
    {
      namespace: "resources",
      patches: [{ op: "add", path: [resourceId], value: resourceValue }],
    },
  ];
  if (nextDataSourceId !== undefined && scopeInstanceId !== undefined) {
    payload.push({
      namespace: "dataSources",
      patches: [
        {
          op: "add",
          path: [nextDataSourceId],
          value: {
            ...createResourceDataSource({
              dataSourceId: nextDataSourceId,
              scopeInstanceId,
              name: dataSourceName ?? resourceInput.name,
              resourceId,
            }),
          },
        },
      ],
    });
  }

  return { payload, dataSourceId: nextDataSourceId, errors };
};

export const createResourceUpdatePayload = ({
  resource,
  values,
  dataSources,
  dataSourceName,
  scopeInstanceId,
}: {
  resource: Resource;
  values: z.infer<typeof resourceFieldsUpdateInput>;
  dataSources: Iterable<DataSource>;
  dataSourceName?: string;
  scopeInstanceId?: string;
}): BuildPatchPayload => {
  const patches = Object.entries(values).flatMap(([name, value]) =>
    value === undefined
      ? []
      : [{ op: "replace" as const, path: [resource.id, name], value }]
  );
  const payload: BuildPatchPayload = compactBuildPatchPayload([
    { namespace: "resources", patches },
  ]);
  const dataSource = Array.from(dataSources).find(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resource.id
  );
  const dataSourcePatches = [];
  if (dataSource !== undefined && dataSourceName !== undefined) {
    dataSourcePatches.push({
      op: "replace" as const,
      path: [dataSource.id, "name"],
      value: dataSourceName,
    });
  }
  if (dataSource !== undefined && scopeInstanceId !== undefined) {
    dataSourcePatches.push({
      op: "replace" as const,
      path: [dataSource.id, "scopeInstanceId"],
      value: scopeInstanceId,
    });
  }
  if (dataSourcePatches.length > 0) {
    payload.push({ namespace: "dataSources", patches: dataSourcePatches });
  }
  return payload;
};

export const createResourceDeletePayload = ({
  resource,
  dataSources,
  props,
  force,
}: {
  resource: Resource;
  dataSources: Iterable<DataSource>;
  props: Iterable<Prop>;
  force?: boolean;
}): {
  payload: BuildPatchPayload;
  dataSourceIds: DataSource["id"][];
  propIds: Prop["id"][];
  isUsed: boolean;
} => {
  const resourceProps = Array.from(props).filter(
    (prop) => prop.type === "resource" && prop.value === resource.id
  );
  if (resourceProps.length > 0 && force !== true) {
    return { payload: [], dataSourceIds: [], propIds: [], isUsed: true };
  }
  const resourceDataSources = Array.from(dataSources).filter(
    (dataSource) =>
      dataSource.type === "resource" && dataSource.resourceId === resource.id
  );
  const payload: BuildPatchPayload = [
    {
      namespace: "resources",
      patches: [{ op: "remove", path: [resource.id] }],
    },
  ];
  if (resourceDataSources.length > 0) {
    payload.push({
      namespace: "dataSources",
      patches: resourceDataSources.map((dataSource) => ({
        op: "remove" as const,
        path: [dataSource.id],
      })),
    });
  }
  if (resourceProps.length > 0) {
    payload.push({
      namespace: "props",
      patches: resourceProps.map((prop) => ({
        op: "remove" as const,
        path: [prop.id],
      })),
    });
  }

  return {
    payload,
    dataSourceIds: resourceDataSources.map((dataSource) => dataSource.id),
    propIds: resourceProps.map((prop) => prop.id),
    isUsed: false,
  };
};
