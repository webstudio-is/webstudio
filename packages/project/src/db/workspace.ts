import type { Database } from "@webstudio-is/postgrest/index.server";
import {
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";

export type Workspace = Database["public"]["Tables"]["Workspace"]["Row"];

const assertUser = (context: AppContext) => {
  if (context.authorization.type !== "user") {
    throw new AuthorizationError("Only logged in users can manage workspaces");
  }
  return context.authorization.userId;
};

export const create = async (
  { name }: { name: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error("Workspace name must be at least 2 characters");
  }

  const result = await context.postgrest.client
    .from("Workspace")
    .insert({
      id: crypto.randomUUID(),
      name: trimmed,
      isDefault: false,
      userId,
    })
    .select()
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data;
};

export const rename = async (
  { workspaceId, name }: { workspaceId: string; name: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error("Workspace name must be at least 2 characters");
  }

  const result = await context.postgrest.client
    .from("Workspace")
    .update({ name: trimmed })
    .eq("id", workspaceId)
    .eq("userId", userId)
    .select()
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data;
};

export const remove = async (
  { workspaceId }: { workspaceId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  // Load the workspace to check ownership and isDefault
  const workspace = await context.postgrest.client
    .from("Workspace")
    .select("id, isDefault, userId")
    .eq("id", workspaceId)
    .single();

  if (workspace.error) {
    throw workspace.error;
  }

  if (workspace.data.userId !== userId) {
    throw new AuthorizationError(
      "Only the workspace owner can delete a workspace"
    );
  }

  if (workspace.data.isDefault) {
    throw new Error("The default workspace cannot be deleted");
  }

  // Reject if workspace still contains projects
  const projects = await context.postgrest.client
    .from("Project")
    .select("id")
    .eq("workspaceId", workspaceId)
    .eq("isDeleted", false)
    .limit(1);

  if (projects.error) {
    throw projects.error;
  }

  if (projects.data.length > 0) {
    throw new Error(
      "Cannot delete a workspace that still contains projects. Move or delete all projects first."
    );
  }

  const result = await context.postgrest.client
    .from("Workspace")
    .delete()
    .eq("id", workspaceId)
    .eq("userId", userId);

  if (result.error) {
    throw result.error;
  }
};

export const findMany = async (userId: string, context: AppContext) => {
  assertUser(context);

  // Workspaces owned by the user
  const owned = await context.postgrest.client
    .from("Workspace")
    .select()
    .eq("userId", userId)
    .order("isDefault", { ascending: false })
    .order("createdAt");

  if (owned.error) {
    throw owned.error;
  }

  // Workspaces where the user is a member (not owner)
  const memberships = await context.postgrest.client
    .from("WorkspaceMember")
    .select("workspaceId")
    .eq("userId", userId);

  if (memberships.error) {
    throw memberships.error;
  }

  const memberWorkspaceIds = memberships.data.map((m) => m.workspaceId);

  if (memberWorkspaceIds.length === 0) {
    return owned.data;
  }

  const memberOf = await context.postgrest.client
    .from("Workspace")
    .select()
    .in("id", memberWorkspaceIds)
    .order("createdAt");

  if (memberOf.error) {
    throw memberOf.error;
  }

  // Owned workspaces first (default on top), then member workspaces
  return [...owned.data, ...memberOf.data];
};
