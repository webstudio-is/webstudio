import type { Database } from "@webstudio-is/postgrest/index.server";
import {
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import { softDeleteProject } from "./project";
import { defaultRole, type Role } from "@webstudio-is/trpc-interface/authorize";
import {
  type WorkspaceInvitePayload,
  type ProjectTransferPayload,
  NOTIFICATION_TTL_MS,
} from "../shared/notification-schema";
import { create as createNotification } from "./notification";

export type Workspace = Database["public"]["Tables"]["Workspace"]["Row"];

export type WorkspaceWithRelation = Workspace & {
  /** The current user's relation to the workspace: "own" for owners */
  role: Role | "own";
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
    .eq("userId", userId)
    .eq("isDeleted", false);

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
    .eq("isDeleted", false)
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
    .eq("isDeleted", false)
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

  // Check for active projects BEFORE soft-deleting to avoid
  // leaving the workspace in a deleted state on error.
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

  if (projectIds.length > 0 && deleteProjects !== true) {
    throw new Error(
      "Cannot delete a workspace that still contains projects. Move or delete all projects first."
    );
  }

  // Soft-delete projects first so the operation is retryable:
  // if a project deletion fails mid-loop the workspace is still visible
  // (isDeleted=false) and the caller can retry the whole operation.
  if (projectIds.length > 0) {
    for (const id of projectIds) {
      await softDeleteProject(id, context);
    }
  }

  // Soft-delete the workspace last — single atomic update makes it
  // immediately invisible everywhere.
  const result = await context.postgrest.client
    .from("Workspace")
    .update({ isDeleted: true })
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
    .eq("isDeleted", false)
    .order("isDefault", { ascending: false })
    .order("createdAt");

  if (owned.error) {
    throw owned.error;
  }

  // Workspaces where the user is a member (not owner)
  const memberships = await context.postgrest.client
    .from("WorkspaceMember")
    .select("workspaceId, relation")
    .eq("userId", userId)
    .is("removedAt", null);

  if (memberships.error) {
    throw memberships.error;
  }

  const memberWorkspaceIds = memberships.data.map((m) => m.workspaceId);
  const relationByWorkspaceId = new Map(
    memberships.data.map((m) => [m.workspaceId, m.relation as Role])
  );

  const ownedWithRelation: WorkspaceWithRelation[] = owned.data.map((w) => ({
    ...w,
    role: "own" as const,
    isDowngraded: false,
  }));

  if (memberWorkspaceIds.length === 0) {
    return ownedWithRelation;
  }

  const memberOf = await context.postgrest.client
    .from("Workspace")
    .select()
    .in("id", memberWorkspaceIds)
    .eq("isDeleted", false)
    .order("createdAt");

  if (memberOf.error) {
    throw memberOf.error;
  }

  // For member workspaces, check if the owner's plan still supports workspace features.
  // Collect unique owner IDs and batch-check their plans.
  const ownerIds = [...new Set(memberOf.data.map((w) => w.userId))];
  const downgradedOwners = new Set<string>();

  if (ownerIds.length > 0) {
    // Use allSettled so a single owner's plan-check failure doesn't
    // break the entire workspace list. Failed checks default to not-downgraded.
    const plans = await Promise.allSettled(
      ownerIds.map(async (ownerId) => {
        const plan = await context.getOwnerPlanFeatures(ownerId);
        return { ownerId, maxWorkspaces: plan.maxWorkspaces };
      })
    );
    for (const result of plans) {
      if (result.status === "fulfilled" && result.value.maxWorkspaces <= 1) {
        downgradedOwners.add(result.value.ownerId);
      }
    }
  }

  const memberWithRelation: WorkspaceWithRelation[] = memberOf.data.map(
    (w) => ({
      ...w,
      role: relationByWorkspaceId.get(w.id) ?? defaultRole,
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
    .eq("isDeleted", false)
    .single();

  if (workspace.error) {
    throw workspace.error;
  }

  if (workspace.data.userId !== userId) {
    throw new AuthorizationError("Only the workspace owner can manage members");
  }

  return workspace.data;
};

/**
 * Count all current members (non-removed) plus pending invites across all
 * non-deleted workspaces owned by userId.
 * The owner is NOT counted.
 * Pending invites are included because seats are billed at invite time.
 */
export const countAllMembers = async (
  userId: string,
  context: AppContext
): Promise<number> => {
  const workspaces = await context.postgrest.client
    .from("Workspace")
    .select("id")
    .eq("userId", userId)
    .eq("isDeleted", false);

  if (workspaces.error) {
    throw workspaces.error;
  }

  if (workspaces.data.length === 0) {
    return 0;
  }

  const workspaceIds = workspaces.data.map((w) => w.id);

  const [membersResult, pendingResult] = await Promise.all([
    context.postgrest.client
      .from("WorkspaceMember")
      .select("userId", { count: "exact", head: true })
      .in("workspaceId", workspaceIds)
      .is("removedAt", null),
    context.postgrest.client
      .from("Notification")
      .select("id", { count: "exact", head: true })
      .eq("type", "workspaceInvite")
      .eq("senderId", userId)
      .eq("status", "pending")
      .gte(
        "createdAt",
        new Date(Date.now() - NOTIFICATION_TTL_MS).toISOString()
      ),
  ]);

  if (membersResult.error) {
    throw membersResult.error;
  }
  if (pendingResult.error) {
    throw pendingResult.error;
  }

  // Avoid double-counting: a pending invite recipient who is also already
  // a member would be in both sets. This is theoretically impossible
  // (addMember guards against it) but we subtract to be safe by using the
  // total of accepted members + non-accepted pending invites.
  // Simple approximation: accepted + pending counts (small overlap risk is acceptable).
  return (membersResult.count ?? 0) + (pendingResult.count ?? 0);
};

export const addMember = async (
  {
    workspaceId,
    email,
    relation,
  }: { workspaceId: string; email: string; relation: Role },
  context: AppContext
): Promise<{ notificationId: string }> => {
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

  if (user.data === null) {
    throw new Error(
      "No Webstudio account found. The user needs to sign up first."
    );
  }

  if (user.data.id === userId) {
    throw new Error("You are already the owner of this workspace");
  }

  const memberId = user.data.id;

  // Check if already a member — no need for a notification
  const existing = await context.postgrest.client
    .from("WorkspaceMember")
    .select("userId")
    .eq("workspaceId", workspaceId)
    .eq("userId", memberId)
    .is("removedAt", null)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data !== null) {
    throw new Error("Already a member of this workspace.");
  }

  // Create a pending notification instead of inserting directly
  const payload: WorkspaceInvitePayload = { workspaceId, relation };
  const notificationId = await createNotification(
    { type: "workspaceInvite", recipientId: memberId, payload },
    context
  );

  return { notificationId };
};

export const updateRole = async (
  {
    workspaceId,
    memberUserId,
    relation,
  }: {
    workspaceId: string;
    memberUserId: string;
    relation: Role;
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
    .is("removedAt", null)
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
      .eq("isDeleted", false)
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
    .update({ removedAt: new Date().toISOString() })
    .eq("workspaceId", workspaceId)
    .eq("userId", memberUserId)
    .is("removedAt", null)
    .select("userId")
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  if (result.data === null) {
    throw new Error("Member not found");
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
    .eq("isDeleted", false)
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
      .is("removedAt", null)
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
    .is("removedAt", null)
    .order("createdAt", { ascending: false });

  if (members.error) {
    throw members.error;
  }

  // Fetch pending workspace invite notifications for this workspace.
  // Only visible to the owner (already verified above).
  const pendingInvites =
    workspace.data.userId === userId
      ? await context.postgrest.client
          .from("Notification")
          .select("id, recipientId, payload, createdAt")
          .eq("type", "workspaceInvite")
          .eq("senderId", workspace.data.userId)
          .eq("status", "pending")
          .gte(
            "createdAt",
            new Date(Date.now() - NOTIFICATION_TTL_MS).toISOString()
          )
          .order("createdAt", { ascending: false })
      : { data: [], error: null };

  if (pendingInvites.error) {
    throw pendingInvites.error;
  }

  // Filter to only invites for this specific workspace.
  const acceptedUserIds = new Set(members.data.map((m) => m.userId));
  const pendingForWorkspace = pendingInvites.data.filter((n) => {
    const payload = n.payload as unknown as Partial<WorkspaceInvitePayload>;
    return (
      payload.workspaceId === workspaceId && !acceptedUserIds.has(n.recipientId)
    );
  });

  // Fetch user info for members, owner, and pending invite recipients.
  const allUserIds = [
    workspace.data.userId,
    ...members.data.map((m) => m.userId),
    ...pendingForWorkspace.map((n) => n.recipientId),
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
    pendingInvites: pendingForWorkspace.map((n) => {
      const payload = n.payload as unknown as WorkspaceInvitePayload;
      return {
        notificationId: n.id,
        recipientId: n.recipientId,
        relation: payload.relation,
        createdAt: n.createdAt,
        email: usersById.get(n.recipientId)?.email ?? "",
      };
    }),
  };
};

/**
 * Verify the caller is the project owner or an admin of the project's source workspace.
 * Returns the loaded project data.
 */
const assertProjectPermission = async (
  {
    projectId,
    userId,
    action,
  }: { projectId: string; userId: string; action: string },
  context: AppContext
) => {
  const project = await context.postgrest.client
    .from("Project")
    .select("id, userId, workspaceId")
    .eq("id", projectId)
    .eq("isDeleted", false)
    .single();

  if (project.error) {
    throw new Error("Project not found");
  }

  const isProjectOwner = project.data.userId === userId;
  const sourceWorkspaceId = project.data.workspaceId;

  if (isProjectOwner === false && sourceWorkspaceId !== null) {
    const membership = await context.postgrest.client
      .from("WorkspaceMember")
      .select("relation")
      .eq("workspaceId", sourceWorkspaceId)
      .eq("userId", userId)
      .is("removedAt", null)
      .maybeSingle();

    if (
      membership.data === null ||
      membership.data.relation !== "administrators"
    ) {
      throw new AuthorizationError(
        `Only the project owner or a workspace admin can ${action} projects`
      );
    }
  } else if (isProjectOwner === false) {
    throw new AuthorizationError(
      `Only the project owner can ${action} this project`
    );
  }

  return project.data;
};

/**
 * Move a project to a different workspace owned by or shared with the current user.
 * No notification is needed — the move is instant.
 */
export const moveProject = async (
  {
    projectId,
    targetWorkspaceId,
  }: { projectId: string; targetWorkspaceId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  const projectData = await assertProjectPermission(
    { projectId, userId, action: "move" },
    context
  );

  // Verify the target workspace exists
  const targetWorkspace = await context.postgrest.client
    .from("Workspace")
    .select("id, userId")
    .eq("id", targetWorkspaceId)
    .eq("isDeleted", false)
    .single();

  if (targetWorkspace.error) {
    throw new Error("Target workspace not found");
  }

  // Verify the caller is owner or admin of the target workspace
  const isTargetOwner = targetWorkspace.data.userId === userId;
  if (isTargetOwner === false) {
    const targetMembership = await context.postgrest.client
      .from("WorkspaceMember")
      .select("relation")
      .eq("workspaceId", targetWorkspaceId)
      .eq("userId", userId)
      .is("removedAt", null)
      .maybeSingle();

    if (
      targetMembership.data === null ||
      targetMembership.data.relation !== "administrators"
    ) {
      throw new AuthorizationError(
        "You need admin or owner permissions on the target workspace"
      );
    }
  }

  // Cross-owner moves are not allowed — use the transfer flow instead
  // so the target workspace owner gets a notification and must accept.
  if (targetWorkspace.data.userId !== projectData.userId) {
    throw new AuthorizationError(
      "Use the transfer flow to move a project to another user's workspace"
    );
  }

  const result = await context.postgrest.client
    .from("Project")
    .update({ workspaceId: targetWorkspaceId })
    .eq("id", projectId)
    .select("id")
    .single();

  if (result.error) {
    throw result.error;
  }
};

/**
 * Initiate a project transfer to another user. Creates a notification
 * the recipient must accept before the project is reassigned.
 */
export const transferProject = async (
  {
    projectId,
    recipientEmail,
    targetWorkspaceId,
  }: {
    projectId: string;
    recipientEmail: string;
    targetWorkspaceId?: string;
  },
  context: AppContext
) => {
  const userId = assertUser(context);

  await assertProjectPermission(
    { projectId, userId, action: "transfer" },
    context
  );

  // Look up the recipient by email
  const recipient = await context.postgrest.client
    .from("User")
    .select("id")
    .eq("email", recipientEmail)
    .maybeSingle();

  if (recipient.error) {
    throw recipient.error;
  }

  // Silently succeed for non-existent emails (anti-enumeration)
  if (recipient.data === null) {
    return;
  }

  if (recipient.data.id === userId) {
    throw new Error("You cannot transfer a project to yourself");
  }

  // If a target workspace is specified, verify it exists and belongs to the recipient
  if (targetWorkspaceId !== undefined) {
    const targetWorkspace = await context.postgrest.client
      .from("Workspace")
      .select("id, userId")
      .eq("id", targetWorkspaceId)
      .eq("isDeleted", false)
      .single();

    if (targetWorkspace.error) {
      throw new Error("Target workspace not found");
    }

    if (targetWorkspace.data.userId !== recipient.data.id) {
      throw new Error("Target workspace does not belong to the recipient");
    }
  }

  const payload: ProjectTransferPayload = {
    projectId,
    targetWorkspaceId,
  };

  await createNotification(
    { type: "projectTransfer", recipientId: recipient.data.id, payload },
    context
  );
};

/**
 * List workspaces owned by a specific user that the current user is a member of.
 * Used in the transfer dialog to show available target workspaces.
 */
export const findSharedWorkspacesByOwnerEmail = async (
  { email }: { email: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  // Look up the target user by email
  const targetUser = await context.postgrest.client
    .from("User")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (targetUser.error) {
    throw targetUser.error;
  }

  // Return empty for non-existent emails (anti-enumeration)
  if (targetUser.data === null) {
    return [];
  }

  // Find workspaces owned by the target user
  const workspaces = await context.postgrest.client
    .from("Workspace")
    .select("id, name")
    .eq("userId", targetUser.data.id)
    .eq("isDeleted", false);

  if (workspaces.error) {
    throw workspaces.error;
  }

  if (workspaces.data.length === 0) {
    return [];
  }

  // Filter to only those where the current user is a member
  const memberships = await context.postgrest.client
    .from("WorkspaceMember")
    .select("workspaceId")
    .eq("userId", userId)
    .is("removedAt", null)
    .in(
      "workspaceId",
      workspaces.data.map((w) => w.id)
    );

  if (memberships.error) {
    throw memberships.error;
  }

  const memberWorkspaceIds = new Set(
    memberships.data.map((m) => m.workspaceId)
  );

  return workspaces.data.filter((w) => memberWorkspaceIds.has(w.id));
};
