import type { Database } from "@webstudio-is/postgrest/index.server";
import {
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { softDeleteProject } from "./project";
import {
  defaultWorkspaceRelation,
  type WorkspaceRelation,
} from "../shared/schema";

export type Workspace = Database["public"]["Tables"]["Workspace"]["Row"];

export type WorkspaceWithRelation = Workspace & {
  /** The current user's relation to the workspace: "own" for owners */
  workspaceRelation: WorkspaceRelation | "own";
  /**
   * True when the workspace owner's plan no longer supports workspace features
   * (maxWorkspaces <= 1). Members lose project access but workspace data stays intact.
   */
  isDowngraded: boolean;
};

const assertUser = (context: AppContext) => {
  if (context.authorization.type !== "user") {
    throw new AuthorizationError("Only logged in users can manage workspaces");
  }
  return context.authorization.userId;
};

export const create = async (
  { name, maxWorkspaces }: { name: string; maxWorkspaces: number },
  context: AppContext
) => {
  const userId = assertUser(context);

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    throw new Error("Workspace name must be at least 2 characters");
  }

  // Count existing workspaces owned by the user
  const countResult = await context.postgrest.client
    .from("Workspace")
    .select("id", { count: "exact", head: true })
    .eq("userId", userId);

  if (countResult.error) {
    throw countResult.error;
  }

  if ((countResult.count ?? 0) >= maxWorkspaces) {
    throw new Error(
      `You have reached the maximum number of workspaces (${maxWorkspaces}).`
    );
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
  {
    workspaceId,
    deleteProjects,
  }: { workspaceId: string; deleteProjects?: boolean },
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

  // Check for active projects
  const projects = await context.postgrest.client
    .from("Project")
    .select("id")
    .eq("workspaceId", workspaceId)
    .eq("isDeleted", false);

  if (projects.error) {
    throw projects.error;
  }

  // Collect project IDs upfront so concurrent changes can't alter the set.
  const projectIds = projects.data.map((p) => p.id);

  if (projectIds.length > 0) {
    if (deleteProjects !== true) {
      throw new Error(
        "Cannot delete a workspace that still contains projects. Move or delete all projects first."
      );
    }

    // Soft-delete each project individually (each needs a unique domain).
    // PostgREST doesn't support multi-request transactions, but this is
    // safe to retry: the project query above filters by isDeleted=false,
    // so already-deleted projects are skipped on the next attempt.
    for (const id of projectIds) {
      await softDeleteProject(id, context);
    }
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
    .select("workspaceId, relation")
    .eq("userId", userId);

  if (memberships.error) {
    throw memberships.error;
  }

  const memberWorkspaceIds = memberships.data.map((m) => m.workspaceId);
  const relationByWorkspaceId = new Map(
    memberships.data.map((m) => [
      m.workspaceId,
      m.relation as WorkspaceRelation,
    ])
  );

  const ownedWithRelation: WorkspaceWithRelation[] = owned.data.map((w) => ({
    ...w,
    workspaceRelation: "own" as const,
    isDowngraded: false,
  }));

  if (memberWorkspaceIds.length === 0) {
    return ownedWithRelation;
  }

  const memberOf = await context.postgrest.client
    .from("Workspace")
    .select()
    .in("id", memberWorkspaceIds)
    .order("createdAt");

  if (memberOf.error) {
    throw memberOf.error;
  }

  // For member workspaces, check if the owner's plan still supports workspace features.
  // Collect unique owner IDs and batch-check their plans.
  const ownerIds = [...new Set(memberOf.data.map((w) => w.userId))];
  const downgradedOwners = new Set<string>();

  if (context.getOwnerPlanFeatures !== undefined) {
    const plans = await Promise.all(
      ownerIds.map(async (ownerId) => {
        // getOwnerPlanFeatures is guaranteed to be defined here
        const plan = await context.getOwnerPlanFeatures!(ownerId);
        return { ownerId, maxWorkspaces: plan.maxWorkspaces };
      })
    );
    for (const { ownerId, maxWorkspaces } of plans) {
      if (maxWorkspaces <= 1) {
        downgradedOwners.add(ownerId);
      }
    }
  }

  const memberWithRelation: WorkspaceWithRelation[] = memberOf.data.map(
    (w) => ({
      ...w,
      workspaceRelation:
        relationByWorkspaceId.get(w.id) ?? defaultWorkspaceRelation,
      isDowngraded: downgradedOwners.has(w.userId),
    })
  );

  // Owned workspaces first (default on top), then member workspaces
  return [...ownedWithRelation, ...memberWithRelation];
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
  {
    workspaceId,
    email,
    relation,
  }: { workspaceId: string; email: string; relation: WorkspaceRelation },
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

  // User not found — silently succeed without creating a placeholder.
  // Returns the same shape to prevent email enumeration.
  if (user.data === null) {
    return;
  }

  if (user.data.id === userId) {
    throw new Error("You are already the owner of this workspace");
  }

  const memberId = user.data.id;

  const result = await context.postgrest.client
    .from("WorkspaceMember")
    .insert({
      workspaceId,
      userId: memberId,
      relation,
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
};

export const updateWorkspaceRelation = async (
  {
    workspaceId,
    memberUserId,
    relation,
  }: {
    workspaceId: string;
    memberUserId: string;
    relation: WorkspaceRelation;
  },
  context: AppContext
) => {
  const userId = assertUser(context);
  await assertOwner(workspaceId, userId, context);

  if (memberUserId === userId) {
    throw new Error("Cannot change the workspace owner's role");
  }

  const result = await context.postgrest.client
    .from("WorkspaceMember")
    .update({ relation })
    .eq("workspaceId", workspaceId)
    .eq("userId", memberUserId)
    .select()
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  if (result.data === null) {
    throw new Error("Member not found");
  }
};

export const removeMember = async (
  { workspaceId, memberUserId }: { workspaceId: string; memberUserId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  // A member can remove themselves (leave) without being the owner.
  const isSelfRemoval = memberUserId === userId;

  if (isSelfRemoval) {
    // Verify the caller is NOT the owner — owners cannot leave their own workspace.
    const workspace = await context.postgrest.client
      .from("Workspace")
      .select("id, userId")
      .eq("id", workspaceId)
      .single();

    if (workspace.error) {
      throw workspace.error;
    }

    if (workspace.data.userId === userId) {
      throw new Error("The workspace owner cannot be removed");
    }
  } else {
    // Only the owner can remove other members.
    await assertOwner(workspaceId, userId, context);
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

  // Fetch user info for all members plus the owner
  const allUserIds = [
    workspace.data.userId,
    ...members.data.map((m) => m.userId),
  ];
  const uniqueUserIds = [...new Set(allUserIds)];

  const users = await context.postgrest.client
    .from("User")
    .select("id, email, username")
    .in("id", uniqueUserIds);

  if (users.error) {
    throw users.error;
  }

  const usersById = new Map(users.data.map((u) => [u.id, u]));

  const ownerUser = usersById.get(workspace.data.userId);

  return {
    owner: {
      userId: workspace.data.userId,
      email: ownerUser?.email ?? "",
      username: ownerUser?.username ?? "",
    },
    members: members.data.map((m) => ({
      userId: m.userId,
      relation: m.relation,
      createdAt: m.createdAt,
      email: usersById.get(m.userId)?.email ?? "",
      username: usersById.get(m.userId)?.username ?? "",
    })),
  };
};
