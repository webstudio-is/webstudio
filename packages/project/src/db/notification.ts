import {
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import {
  type NotificationType,
  type NotificationStatus,
  NOTIFICATION_TTL_MS,
  WorkspaceInvitePayload,
  ProjectTransferPayload,
} from "../shared/schema";

const assertUser = (context: AppContext) => {
  if (context.authorization.type !== "user") {
    throw new AuthorizationError(
      "Only logged in users can manage notifications"
    );
  }
  return context.authorization.userId;
};

const expirationCutoff = () =>
  new Date(Date.now() - NOTIFICATION_TTL_MS).toISOString();

export const create = async (
  {
    type,
    recipientId,
    payload,
  }: {
    type: NotificationType;
    recipientId: string;
    payload: Record<string, unknown>;
  },
  context: AppContext
): Promise<string> => {
  const senderId = assertUser(context);

  // Idempotency: skip if a pending, non-expired notification already exists
  // for the same type + recipient + distinguishing payload key.
  const existing = await context.postgrest.client
    .from("Notification")
    .select("id", { count: "exact", head: true })
    .eq("type", type)
    .eq("recipientId", recipientId)
    .eq("senderId", senderId)
    .eq("status", "pending")
    .gte("createdAt", expirationCutoff());

  if (existing.error) {
    throw existing.error;
  }

  // For workspace invites, also match on workspaceId in the payload
  if (type === "workspaceInvite" && (existing.count ?? 0) > 0) {
    // Check if any of the existing ones match this specific workspace
    const duplicate = await context.postgrest.client
      .from("Notification")
      .select("id")
      .eq("type", type)
      .eq("recipientId", recipientId)
      .eq("senderId", senderId)
      .eq("status", "pending")
      .gte("createdAt", expirationCutoff())
      .contains("payload", {
        workspaceId: (payload as { workspaceId: string }).workspaceId,
      })
      .maybeSingle();

    if (duplicate.error) {
      throw duplicate.error;
    }

    if (duplicate.data !== null) {
      return duplicate.data.id;
    }
  }

  // For project transfers, only one pending transfer per project is allowed
  // (across all senders and recipients).
  if (type === "projectTransfer") {
    const duplicate = await context.postgrest.client
      .from("Notification")
      .select("id")
      .eq("type", type)
      .eq("status", "pending")
      .gte("createdAt", expirationCutoff())
      .contains("payload", {
        projectId: (payload as { projectId: string }).projectId,
      })
      .maybeSingle();

    if (duplicate.error) {
      throw duplicate.error;
    }

    if (duplicate.data !== null) {
      throw new Error(
        "A transfer is already pending for this project. Cancel it first."
      );
    }
  }

  const result = await context.postgrest.client
    .from("Notification")
    .insert({
      id: crypto.randomUUID(),
      type,
      recipientId,
      senderId,
      status: "pending" satisfies NotificationStatus,
      payload: payload as unknown as string,
    })
    .select()
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data.id;
};

export const list = async (context: AppContext) => {
  const userId = assertUser(context);

  const result = await context.postgrest.client
    .from("Notification")
    .select("*")
    .eq("recipientId", userId)
    .eq("status", "pending")
    .gte("createdAt", expirationCutoff())
    .order("createdAt", { ascending: false });

  if (result.error) {
    throw result.error;
  }

  if (result.data.length === 0) {
    return [];
  }

  // Resolve sender info
  const senderIds = [...new Set(result.data.map((n) => n.senderId))];
  const users = await context.postgrest.client
    .from("User")
    .select("id, email, username")
    .in("id", senderIds);

  if (users.error) {
    throw users.error;
  }

  const usersById = new Map(users.data.map((u) => [u.id, u]));

  // Parse payloads once and cache results
  const parsedInvites = new Map<string, WorkspaceInvitePayload>();
  const parsedTransfers = new Map<string, ProjectTransferPayload>();

  for (const n of result.data) {
    if (n.type === "workspaceInvite") {
      const parsed = WorkspaceInvitePayload.safeParse(n.payload);
      if (parsed.success) {
        parsedInvites.set(n.id, parsed.data);
      }
    } else if (n.type === "projectTransfer") {
      const parsed = ProjectTransferPayload.safeParse(n.payload);
      if (parsed.success) {
        parsedTransfers.set(n.id, parsed.data);
      }
    }
  }

  // Resolve workspace names for workspaceInvite notifications
  const uniqueWorkspaceIds = [
    ...new Set([...parsedInvites.values()].map((p) => p.workspaceId)),
  ];

  const workspacesById = new Map<
    string,
    { id: string; name: string; userId: string }
  >();

  if (uniqueWorkspaceIds.length > 0) {
    const workspaces = await context.postgrest.client
      .from("Workspace")
      .select("id, name, userId")
      .in("id", uniqueWorkspaceIds);

    if (workspaces.error) {
      throw workspaces.error;
    }

    for (const w of workspaces.data) {
      workspacesById.set(w.id, w);
    }
  }

  // Resolve project titles for projectTransfer notifications
  const uniqueProjectIds = [
    ...new Set([...parsedTransfers.values()].map((p) => p.projectId)),
  ];

  const projectsById = new Map<string, { id: string; title: string }>();

  if (uniqueProjectIds.length > 0) {
    const projects = await context.postgrest.client
      .from("Project")
      .select("id, title")
      .in("id", uniqueProjectIds);

    if (projects.error) {
      throw projects.error;
    }

    for (const p of projects.data) {
      projectsById.set(p.id, p);
    }
  }

  return result.data.map((n) => {
    const sender = usersById.get(n.senderId);
    const invite = parsedInvites.get(n.id);
    const transfer = parsedTransfers.get(n.id);

    return {
      id: n.id,
      type: n.type,
      status: n.status,
      payload: n.payload as Record<string, unknown>,
      createdAt: n.createdAt,
      senderEmail: sender?.email ?? "",
      senderName: sender?.username ?? "",
      workspaceName: invite
        ? workspacesById.get(invite.workspaceId)?.name
        : undefined,
      projectTitle: transfer
        ? projectsById.get(transfer.projectId)?.title
        : undefined,
    };
  });
};

export const count = async (context: AppContext) => {
  const userId = assertUser(context);

  const result = await context.postgrest.client
    .from("Notification")
    .select("id", { count: "exact", head: true })
    .eq("recipientId", userId)
    .eq("status", "pending")
    .gte("createdAt", expirationCutoff());

  if (result.error) {
    throw result.error;
  }

  return result.count ?? 0;
};

export const accept = async (
  {
    notificationId,
    targetWorkspaceId,
  }: { notificationId: string; targetWorkspaceId?: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  // Load the notification
  const notification = await context.postgrest.client
    .from("Notification")
    .select("*")
    .eq("id", notificationId)
    .eq("recipientId", userId)
    .single();

  if (notification.error) {
    throw new Error("Notification not found");
  }

  if (notification.data.status !== "pending") {
    throw new Error("This notification has already been acted on");
  }

  // Check expiration
  const createdAt = new Date(notification.data.createdAt).getTime();
  if (Date.now() - createdAt > NOTIFICATION_TTL_MS) {
    throw new Error("This invitation has expired");
  }

  // Perform type-specific side effect
  if (notification.data.type === "workspaceInvite") {
    const parsed = WorkspaceInvitePayload.parse(notification.data.payload);

    // Verify the workspace still exists
    const workspace = await context.postgrest.client
      .from("Workspace")
      .select("id")
      .eq("id", parsed.workspaceId)
      .maybeSingle();

    if (workspace.error) {
      throw workspace.error;
    }

    if (workspace.data === null) {
      // Auto-decline — workspace no longer exists
      await context.postgrest.client
        .from("Notification")
        .update({
          status: "declined" satisfies NotificationStatus,
          respondedAt: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .select("id")
        .single();

      throw new Error("This workspace no longer exists");
    }

    // Upsert the member — handles re-inviting previously removed members
    const member = await context.postgrest.client
      .from("WorkspaceMember")
      .upsert(
        {
          workspaceId: parsed.workspaceId,
          userId,
          relation: parsed.relation,
          // null required by PostgREST to clear the column
          removedAt: null,
        },
        { onConflict: "workspaceId,userId" }
      )
      .select()
      .single();

    if (member.error) {
      throw member.error;
    }
  }

  if (notification.data.type === "projectTransfer") {
    if (userId === notification.data.senderId) {
      throw new Error("You cannot accept your own transfer request");
    }

    const parsed = ProjectTransferPayload.parse(notification.data.payload);

    // Verify the project still exists
    const project = await context.postgrest.client
      .from("Project")
      .select("id, userId")
      .eq("id", parsed.projectId)
      .eq("isDeleted", false)
      .maybeSingle();

    if (project.error) {
      throw project.error;
    }

    if (project.data === null) {
      await context.postgrest.client
        .from("Notification")
        .update({
          status: "declined" satisfies NotificationStatus,
          respondedAt: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .select("id")
        .single();

      throw new Error("This project no longer exists");
    }

    // Verify the sender still owns the project
    if (project.data.userId !== notification.data.senderId) {
      await context.postgrest.client
        .from("Notification")
        .update({
          status: "declined" satisfies NotificationStatus,
          respondedAt: new Date().toISOString(),
        })
        .eq("id", notificationId)
        .select("id")
        .single();

      throw new Error("The sender no longer owns this project");
    }

    // Check receiver's plan limit before accepting the transfer
    if (context.getOwnerPlanFeatures !== undefined) {
      const receiverPlan = await context.getOwnerPlanFeatures(userId);
      const projectCount = await context.postgrest.client
        .from("Project")
        .select("id", { count: "exact", head: true })
        .eq("userId", userId)
        .eq("isDeleted", false);

      if (projectCount.error) {
        throw projectCount.error;
      }

      if ((projectCount.count ?? 0) >= receiverPlan.maxProjectsAllowedPerUser) {
        throw new Error(
          "You've reached the project limit for your plan. Upgrade or delete projects to accept this transfer."
        );
      }
    }

    // Determine the target workspace: use the one from the notification payload,
    // or fall back to the one provided by the receiver at accept time.
    const resolvedWorkspaceId = parsed.targetWorkspaceId ?? targetWorkspaceId;

    if (resolvedWorkspaceId !== undefined) {
      // Verify the workspace exists and belongs to the receiver
      const workspace = await context.postgrest.client
        .from("Workspace")
        .select("id, userId")
        .eq("id", resolvedWorkspaceId)
        .maybeSingle();

      if (workspace.error) {
        throw workspace.error;
      }

      if (workspace.data === null) {
        await context.postgrest.client
          .from("Notification")
          .update({
            status: "declined" satisfies NotificationStatus,
            respondedAt: new Date().toISOString(),
          })
          .eq("id", notificationId)
          .select("id")
          .single();

        throw new Error("This workspace no longer exists");
      }

      if (workspace.data.userId !== userId) {
        throw new AuthorizationError(
          "You can only transfer projects into your own workspaces"
        );
      }

      // Reassign the project to the target workspace and its owner
      console.info(
        `Project ownership change (transfer accepted): project=${parsed.projectId} from=${notification.data.senderId} to=${userId} workspace=${resolvedWorkspaceId}`
      );

      const updateResult = await context.postgrest.client
        .from("Project")
        .update({
          userId,
          workspaceId: resolvedWorkspaceId,
        })
        .eq("id", parsed.projectId)
        .select("id")
        .single();

      if (updateResult.error) {
        throw new Error("Failed to reassign the project");
      }
    } else {
      // No workspace specified — assign to receiver's default workspace
      const defaultWorkspace = await context.postgrest.client
        .from("Workspace")
        .select("id")
        .eq("userId", userId)
        .eq("isDefault", true)
        .maybeSingle();

      if (defaultWorkspace.error) {
        throw defaultWorkspace.error;
      }

      console.info(
        `Project ownership change (transfer accepted): project=${parsed.projectId} from=${notification.data.senderId} to=${userId} workspace=${defaultWorkspace.data?.id ?? "default"}`
      );

      const updateResult = await context.postgrest.client
        .from("Project")
        .update({
          userId,
          workspaceId: defaultWorkspace.data?.id ?? null,
        })
        .eq("id", parsed.projectId)
        .select("id")
        .single();

      if (updateResult.error) {
        throw new Error("Failed to reassign the project");
      }
    }
  }

  // Mark as accepted
  const update = await context.postgrest.client
    .from("Notification")
    .update({
      status: "accepted" satisfies NotificationStatus,
      respondedAt: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .select("id")
    .single();

  if (update.error) {
    throw update.error;
  }
};

export const decline = async (
  { notificationId }: { notificationId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  const notification = await context.postgrest.client
    .from("Notification")
    .select("id, recipientId, status")
    .eq("id", notificationId)
    .eq("recipientId", userId)
    .single();

  if (notification.error) {
    throw new Error("Notification not found");
  }

  if (notification.data.status !== "pending") {
    throw new Error("This notification has already been acted on");
  }

  const result = await context.postgrest.client
    .from("Notification")
    .update({
      status: "declined" satisfies NotificationStatus,
      respondedAt: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .select("id")
    .single();

  if (result.error) {
    throw result.error;
  }
};

export const cancel = async (
  { notificationId }: { notificationId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  const notification = await context.postgrest.client
    .from("Notification")
    .select("id, senderId, status")
    .eq("id", notificationId)
    .eq("senderId", userId)
    .single();

  if (notification.error) {
    throw new Error("Notification not found");
  }

  if (notification.data.status !== "pending") {
    throw new Error("This notification has already been acted on");
  }

  const cancelResult = await context.postgrest.client
    .from("Notification")
    .update({
      status: "declined" satisfies NotificationStatus,
      respondedAt: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .select("id")
    .single();

  if (cancelResult.error) {
    throw cancelResult.error;
  }
};
