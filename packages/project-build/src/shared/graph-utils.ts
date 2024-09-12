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
