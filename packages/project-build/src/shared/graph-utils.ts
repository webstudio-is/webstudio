import type { Instance } from "@webstudio-is/sdk";

type InstanceId = Instance["id"];

// Depth-First Search (DFS) algorithm to find cycles in a directed graph
export const findCycles = (
  graph: Iterable<Pick<Instance, "id" | "children">>
): InstanceId[][] => {
  const adjacencyList: Record<InstanceId, InstanceId[]> = {};

  // Build adjacency list
  for (const node of graph) {
    adjacencyList[node.id] = node.children
      .filter((child) => child.type === "id")
      .map((child) => child.value);
  }

  const visited = new Set<string>();
  const path: InstanceId[] = [];
  const cycles: InstanceId[][] = [];

  const dfs = (nodeId: string): void => {
    if (path.includes(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart).concat(nodeId));
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    path.push(nodeId);

    for (const childId of adjacencyList[nodeId] || []) {
      dfs(childId);
    }

    path.pop();
  };

  // Start DFS from each node
  for (const node of graph) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycles;
};

export const breakCyclesMutable = <T extends Pick<Instance, "id" | "children">>(
  instances: Iterable<T>,
  breakOn: (node: T) => boolean
) => {
  const cycles = findCycles(instances);
  if (cycles.length === 0) {
    return instances;
  }

  const cycleInstances = new Map<T["id"], T>();
  const cycleInstanceIdSet = new Set<T["id"]>(cycles.flat());

  // Pick all instances that are part of the cycle
  for (const instance of instances) {
    if (cycleInstanceIdSet.has(instance.id)) {
      cycleInstances.set(instance.id, instance);
    }
  }

  for (const cycle of cycles) {
    // Find slot or take last instance
    const slotId =
      cycle.find((id) => breakOn(cycleInstances.get(id)!)) ??
      cycle[cycle.length - 1];

    // Remove slot from children of all instances in the cycle
    for (const id of cycle) {
      const instance = cycleInstances.get(id);
      if (instance === undefined) {
        continue;
      }

      if (instance.children.find((child) => child.value === slotId)) {
        instance.children = instance.children.filter(
          (child) => child.value !== slotId
        );
      }
    }
  }
  return instances;
};
