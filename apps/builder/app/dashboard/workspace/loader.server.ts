import { workspace as workspaceApi } from "@webstudio-is/project/index.server";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import type { Role, WorkspaceWithRelation } from "@webstudio-is/project";
import { resolveCurrentWorkspace } from "./utils";

type WorkspaceLoadResult =
  | { type: "redirect"; to: string }
  | {
      type: "ok";
      workspaces: Array<WorkspaceWithRelation>;
      currentWorkspace: WorkspaceWithRelation | undefined;
      currentWorkspaceId: string | undefined;
      role: Role | "own";
    };

/**
 * Load workspaces for the dashboard and resolve the current workspace from the URL.
 * Returns a redirect target when the selected workspace ID is stale (deleted/removed).
 */
export const loadWorkspacesForDashboard = async (
  userId: string,
  url: URL,
  context: AppContext
): Promise<WorkspaceLoadResult> => {
  const workspaces = await workspaceApi.findMany(userId, context);
  const selectedId = url.searchParams.get("workspaceId") ?? undefined;
  const result = resolveCurrentWorkspace(workspaces, selectedId);

  if (result.type === "stale") {
    const clean = new URL(url.toString());
    clean.searchParams.delete("workspaceId");
    const search = clean.searchParams.toString();
    return {
      type: "redirect",
      to: search ? `${clean.pathname}?${search}` : clean.pathname,
    };
  }

  const currentWorkspace = result.workspace;
  return {
    type: "ok",
    workspaces,
    currentWorkspace,
    currentWorkspaceId: currentWorkspace?.id,
    role: (currentWorkspace?.role ?? "own") as Role | "own",
  };
};
