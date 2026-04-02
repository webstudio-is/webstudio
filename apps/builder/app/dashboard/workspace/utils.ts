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

/**
 * Pure function: returns true when the workspace owner's plan has been
 * downgraded and the current user is a non-owner member.
 * In that case the dashboard should hide shared projects on reload.
 */
export const isDowngradedForMember = (
  workspace: WorkspaceWithRelation | undefined
): boolean => workspace?.isDowngraded === true && workspace.role !== "own";
