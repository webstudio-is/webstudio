import {
  findTreeInstanceIds,
  getParentInstanceById,
  ROOT_INSTANCE_ID,
} from "./instances-utils";
import {
  getResourceDataSourceIds,
  getResourceDependencyIds,
} from "./resource-dependencies";
import {
  browserInfoParameterName,
  formDataParameterName,
} from "./managed-form-submission";
import type { Instances } from "./schema/instances";
import type { DataSource, DataSources } from "./schema/data-sources";
import type { Resources } from "./schema/resources";
import { SYSTEM_VARIABLE_ID } from "./expression";

export class InvalidManagedFormGraph extends Error {}

/** Keep Form-only inputs and their Resource dependents out of page-load graphs. */
export const getManagedFormSubmissionResourceIds = ({
  instances,
  dataSources,
  resources,
}: {
  instances: Instances;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const formParameterIds = new Set(
    Array.from(dataSources.values())
      .filter(
        (source) =>
          source.type === "parameter" &&
          (source.name === formDataParameterName ||
            source.name === browserInfoParameterName) &&
          instances.get(source.scopeInstanceId ?? "")?.component === "NativeForm"
      )
      .map(({ id }) => id)
  );
  const submissionResourceIds = new Set(
    Array.from(resources.values())
      .filter((resource) =>
        Array.from(getResourceDataSourceIds(resource)).some((id) =>
          formParameterIds.has(id)
        )
      )
      .map(({ id }) => id)
  );
  let changed = true;
  while (changed) {
    changed = false;
    for (const resource of resources.values()) {
      if (submissionResourceIds.has(resource.id)) {
        continue;
      }
      if (
        Array.from(getResourceDependencyIds({ resource, dataSources })).some(
          (id) => submissionResourceIds.has(id)
        )
      ) {
        submissionResourceIds.add(resource.id);
        changed = true;
      }
    }
  }
  return { formParameterIds, submissionResourceIds };
};

/** Resolve the parameters available to both Preview and published submissions. */
export const getManagedFormParameterBinding = ({
  source,
  formId,
  instances,
  systemDataSourceId,
}: {
  source: Extract<DataSource, { type: "parameter" }>;
  formId: string;
  instances: Instances;
  systemDataSourceId?: string;
}): "system" | "formData" | "browserInfo" => {
  if (source.id === SYSTEM_VARIABLE_ID || source.id === systemDataSourceId) {
    return "system";
  }
  if (
    source.scopeInstanceId === formId &&
    instances.get(formId)?.component === "NativeForm" &&
    (source.name === formDataParameterName ||
      source.name === browserInfoParameterName)
  ) {
    return source.name;
  }
  throw new InvalidManagedFormGraph(
    `Managed Form ${formId} cannot resolve parameter ${source.id}`
  );
};

/** Both draft and published Actions follow the Builder's variable ancestry. */
export const getManagedFormResourceRoots = ({
  formId,
  destinationDataSourceIds,
  instances,
  dataSources,
  resources,
}: {
  formId: string;
  destinationDataSourceIds: readonly string[];
  instances: Instances;
  dataSources: DataSources;
  resources: Resources;
}) => {
  const parents = getParentInstanceById(instances);
  const scopes = new Set([ROOT_INSTANCE_ID]);
  let current: string | undefined = formId;
  while (current !== undefined && !scopes.has(current)) {
    scopes.add(current);
    current = parents.get(current);
  }
  const roots = new Set<string>();
  const externalRootIds = new Set<string>();
  for (const id of destinationDataSourceIds) {
    const source = dataSources.get(id);
    if (
      source?.type !== "resource" ||
      !resources.has(source.resourceId) ||
      !scopes.has(source.scopeInstanceId ?? ROOT_INSTANCE_ID)
    ) {
      throw new InvalidManagedFormGraph(
        "Resource destination not found in Form scope"
      );
    }
    roots.add(source.resourceId);
    if (source.scopeInstanceId !== formId) {
      externalRootIds.add(source.resourceId);
    }
  }
  return { rootIds: [...roots], externalRootIds };
};

/** Plan dependency and binding scope once for draft evaluation and source generation. */
export const getManagedFormResourcePlan = (
  input: Parameters<typeof getManagedFormResourceRoots>[0]
) => {
  const { formId, instances, dataSources, resources } = input;
  const { rootIds, externalRootIds } = getManagedFormResourceRoots(input);
  const resourceIds = new Set<string>();
  const dependenciesById = new Map<string, string[]>();
  const visit = (id: string) => {
    if (resourceIds.has(id)) {
      return;
    }
    const resource = resources.get(id);
    if (resource === undefined) {
      throw new InvalidManagedFormGraph(
        `Managed Form Resource ${id} is missing`
      );
    }
    resourceIds.add(id);
    const dependencies = Array.from(
      getResourceDependencyIds({ resource, dataSources })
    );
    dependenciesById.set(id, dependencies);
    // Invalid visitor dependencies are reported by the optional Action preflight.
    if (
      !(rootIds.includes(id) && resource.email?.recipientMode === "visitor")
    ) {
      for (const dependency of dependencies) {
        visit(dependency);
      }
    }
  };
  for (const id of rootIds) {
    visit(id);
  }
  const externalClosureIds = new Set<string>();
  const markExternal = (id: string) => {
    if (externalClosureIds.has(id)) {
      return;
    }
    externalClosureIds.add(id);
    for (const dependency of dependenciesById.get(id) ?? []) {
      markExternal(dependency);
    }
  };
  for (const id of externalRootIds) {
    markExternal(id);
  }
  const formTreeIds = findTreeInstanceIds(instances, formId);
  const formBoundIds = new Set<string>();
  const externallyScopedIds = new Set<string>();
  for (const source of dataSources.values()) {
    if (source.type === "resource") {
      (formTreeIds.has(source.scopeInstanceId ?? "")
        ? formBoundIds
        : externallyScopedIds
      ).add(source.resourceId);
    }
  }
  // The selected alias owns the Action scope, even when another alias is local.
  for (const id of externalRootIds) {
    formBoundIds.delete(id);
  }
  const requestErrors = new Map<string, string>();
  for (const id of resourceIds) {
    const resource = resources.get(id)!;
    const usesFormData = Array.from(getResourceDataSourceIds(resource)).some(
      (sourceId) => {
        const source = dataSources.get(sourceId);
        return (
          source?.type === "parameter" &&
          source.scopeInstanceId === formId &&
          (source.name === formDataParameterName ||
            source.name === browserInfoParameterName)
        );
      }
    );
    if (
      usesFormData &&
      (!formBoundIds.has(id) ||
        externallyScopedIds.has(id) ||
        externalClosureIds.has(id))
    ) {
      const message = `External Resource ${id} cannot bind Form data`;
      if (rootIds.includes(id) && resource.email?.recipientMode === "visitor") {
        requestErrors.set(id, message);
      } else {
        throw new InvalidManagedFormGraph(message);
      }
    }
  }
  return {
    rootIds,
    resourceIds,
    dependenciesById,
    formBoundIds,
    requestErrors,
  };
};
