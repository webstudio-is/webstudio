import type { ResourceRequestResource } from "../resource-loader";

export const getReachableResources = <
  Resource extends ResourceRequestResource,
>(graph: {
  resources: readonly Resource[];
  rootIds: readonly string[];
}) => {
  const resourcesById = new Map(
    graph.resources.map((resource) => [resource.id, resource])
  );
  const visited = new Set<string>();
  const reachable: Resource[] = [];
  const visit = (resourceId: string) => {
    if (visited.has(resourceId)) {
      return;
    }
    visited.add(resourceId);
    const resource = resourcesById.get(resourceId);
    if (resource === undefined) {
      return;
    }
    reachable.push(resource);
    for (const dependency of resource.dependencies) {
      visit(dependency);
    }
  };
  for (const rootId of graph.rootIds) {
    visit(rootId);
  }
  return reachable;
};
