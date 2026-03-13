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

const assertOwner = async (
  workspaceId: string,
  userId: string,
  context: AppContext
) => {
  const workspace = await context.postgrest.client
    .from("Workspace")
    .select("id, userId")
    .eq("id", workspaceId)
    .single();

  if (workspace.error) {
    throw workspace.error;
  }

  if (workspace.data.userId !== userId) {
    throw new AuthorizationError("Only the workspace owner can manage members");
  }

  return workspace.data;
};

export const addMember = async (
  { workspaceId, email }: { workspaceId: string; email: string },
  context: AppContext
) => {
  const userId = assertUser(context);
  await assertOwner(workspaceId, userId, context);

  // Look up the user by email
  const user = await context.postgrest.client
    .from("User")
    .select("id, email, username")
    .eq("email", email)
    .maybeSingle();

  if (user.error) {
    throw user.error;
  }

  let memberId: string;

  if (user.data) {
    if (user.data.id === userId) {
      throw new Error("You are already the owner of this workspace");
    }
    memberId = user.data.id;
  } else {
    // Create a placeholder user for the invited email
    const newUser = await context.postgrest.client
      .from("User")
      .insert({ id: crypto.randomUUID(), email })
      .select("id")
      .single();

    if (newUser.error) {
      throw newUser.error;
    }
    memberId = newUser.data.id;
  }

  const result = await context.postgrest.client
    .from("WorkspaceMember")
    .insert({
      workspaceId,
      userId: memberId,
      relation: "administrators",
    })
    .select()
    .single();

  if (result.error) {
    // Silently succeed if already a member
    if (result.error.code === "23505") {
      return;
    }
    throw result.error;
  }

  return result.data;
};

export const removeMember = async (
  { workspaceId, memberUserId }: { workspaceId: string; memberUserId: string },
  context: AppContext
) => {
  const userId = assertUser(context);
  await assertOwner(workspaceId, userId, context);

  if (memberUserId === userId) {
    throw new Error("The workspace owner cannot be removed");
  }

  const result = await context.postgrest.client
    .from("WorkspaceMember")
    .delete()
    .eq("workspaceId", workspaceId)
    .eq("userId", memberUserId);

  if (result.error) {
    throw result.error;
  }
};

export const listMembers = async (
  { workspaceId }: { workspaceId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  // Verify the caller is the owner or a member
  const workspace = await context.postgrest.client
    .from("Workspace")
    .select("id, userId")
    .eq("id", workspaceId)
    .single();

  if (workspace.error) {
    throw workspace.error;
  }

  if (workspace.data.userId !== userId) {
    // Check if caller is a member
    const membership = await context.postgrest.client
      .from("WorkspaceMember")
      .select("userId")
      .eq("workspaceId", workspaceId)
      .eq("userId", userId)
      .maybeSingle();

    if (membership.error) {
      throw membership.error;
    }

    if (membership.data === null) {
      throw new AuthorizationError("You don't have access to this workspace");
    }
  }

  const members = await context.postgrest.client
    .from("WorkspaceMember")
    .select("userId, relation, createdAt")
    .eq("workspaceId", workspaceId)
    .order("createdAt", { ascending: false });

  if (members.error) {
    throw members.error;
  }

  const memberUserIds = members.data.map((m) => m.userId);

  if (memberUserIds.length === 0) {
    return [];
  }

  const users = await context.postgrest.client
    .from("User")
    .select("id, email, username")
    .in("id", memberUserIds);

  if (users.error) {
    throw users.error;
  }

  const usersById = new Map(users.data.map((u) => [u.id, u]));

  return members.data.map((m) => ({
    userId: m.userId,
    relation: m.relation,
    createdAt: m.createdAt,
    email: usersById.get(m.userId)?.email ?? null,
    username: usersById.get(m.userId)?.username ?? null,
  }));
};
