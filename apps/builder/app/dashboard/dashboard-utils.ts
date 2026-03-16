import type { WorkspaceWithRelation } from "@webstudio-is/project";

type ResolveWorkspaceResult =
  | { type: "stale" }
  | { type: "resolved"; workspace: WorkspaceWithRelation | undefined };

/**
 * Pure function: given a list of workspaces and an optional selected ID
 * (from URL), returns the current workspace or signals a stale reference.
 */
export const resolveCurrentWorkspace = (
  workspaces: Array<WorkspaceWithRelation>,
  selectedId: string | undefined
): ResolveWorkspaceResult => {
  if (selectedId !== undefined) {
    const matched = workspaces.find((w) => w.id === selectedId);
    if (matched === undefined) {
      return { type: "stale" };
    }
    return { type: "resolved", workspace: matched };
  }
  return { type: "resolved", workspace: workspaces.find((w) => w.isDefault) };
};
