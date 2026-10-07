import { getParentInstanceById, ROOT_INSTANCE_ID } from "./instances-utils";
import type { Instances } from "./schema/instances";
import type { DataSources } from "./schema/data-sources";
import type { Resources } from "./schema/resources";

export class InvalidManagedFormGraph extends Error {}

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
