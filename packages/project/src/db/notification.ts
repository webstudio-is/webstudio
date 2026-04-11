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
} from "../shared/notification-schema";
import { roleLabels } from "@webstudio-is/trpc-interface/authorize";

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

  // For workspace invites, check if a pending invite for the same workspace exists.
  if (type === "workspaceInvite") {
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

  const newId = crypto.randomUUID();

  const result = await context.postgrest.client
    .from("Notification")
    .insert({
      id: newId,
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

  // Post-insert dedup: if a concurrent request inserted an identical
  // notification between our check and our insert, keep the one with the
  // earliest createdAt and silently discard ours.
  const dedup = await postInsertDedup({
    newId,
    type,
    recipientId,
    senderId,
    payload,
    client: context.postgrest.client,
  });

  return dedup ?? newId;
};

/**
 * After inserting a notification, check whether a concurrent request created a
 * duplicate. If one exists, delete the row we just inserted and return the
 * existing id. Returns undefined when no duplicate was found.
 */
const postInsertDedup = async ({
  newId,
  type,
  recipientId,
  senderId,
  payload,
  client,
}: {
  newId: string;
  type: NotificationType;
  recipientId: string;
  senderId: string;
  payload: Record<string, unknown>;
  client: AppContext["postgrest"]["client"];
}): Promise<string | undefined> => {
  let query = client
    .from("Notification")
    .select("id, createdAt")
    .eq("type", type)
    .eq("status", "pending")
    .gte("createdAt", expirationCutoff())
    .order("createdAt", { ascending: true });

  if (type === "workspaceInvite") {
    query = query
      .eq("recipientId", recipientId)
      .eq("senderId", senderId)
      .contains("payload", {
        workspaceId: (payload as { workspaceId: string }).workspaceId,
      });
  } else if (type === "projectTransfer") {
    query = query.contains("payload", {
      projectId: (payload as { projectId: string }).projectId,
    });
  } else {
    return;
  }

  const { data, error } = await query;

  if (error) {
    console.error("postInsertDedup: failed to query duplicates:", error);
    return;
  }

  if (data === null || data.length <= 1) {
    return;
  }

  // Keep the earliest; if ours isn't earliest, delete ours.
  const earliest = data[0];
  if (earliest.id !== newId) {
    // For projectTransfer, verify the winning notification was sent by the
    // same sender. Otherwise the caller would receive an ID they didn't
    // create and can't cancel.
    if (type === "projectTransfer") {
      const winner = await client
        .from("Notification")
        .select("senderId")
        .eq("id", earliest.id)
        .single();

      if (winner.data?.senderId !== senderId) {
        // Different sender won the race — delete ours and surface error.
        await client.from("Notification").delete().eq("id", newId);
        throw new Error(
          "A transfer is already pending for this project. Cancel it first."
        );
      }
    }

    const del = await client.from("Notification").delete().eq("id", newId);
    if (del.error) {
      console.error(
        `postInsertDedup: failed to remove duplicate notification ${newId}:`,
        del.error
      );
    }
    return earliest.id;
  }
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
      .in("id", uniqueWorkspaceIds)
      .eq("isDeleted", false);

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

    const senderLabel = sender?.username || sender?.email || "Someone";
    const workspaceName = invite
      ? workspacesById.get(invite.workspaceId)?.name
      : undefined;
    const projectTitle = transfer
      ? projectsById.get(transfer.projectId)?.title
      : undefined;

    return {
      id: n.id,
      type: n.type,
      status: n.status,
      payload: n.payload as Record<string, unknown>,
      createdAt: n.createdAt,
      senderEmail: sender?.email ?? "",
      senderName: sender?.username ?? "",
      workspaceName,
      projectTitle,
      description: describeNotification({
        type: n.type,
        senderLabel,
        workspaceName,
        projectTitle,
        invite,
      }),
    };
  });
};

/**
 * Build a human-readable one-liner for a notification.
 *
 * Extracted as a pure function so the popover never needs to know
 * about individual notification types — adding a new type only
 * requires updating this switch.
 */
const describeNotification = ({
  type,
  senderLabel,
  workspaceName,
  projectTitle,
  invite,
}: {
  type: string;
  senderLabel: string;
  workspaceName?: string;
  projectTitle?: string;
  invite?: WorkspaceInvitePayload;
}): string => {
  if (type === "workspaceInvite" && invite) {
    const roleLabel =
      roleLabels[invite.relation]?.toLowerCase() ?? invite.relation;
    return `${senderLabel} invited you to "${workspaceName ?? "a workspace"}" as ${roleLabel}`;
  }

  if (type === "projectTransfer") {
    return `${senderLabel} wants to transfer "${projectTitle ?? "a project"}" to you`;
  }

  return "You have a new notification";
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

  // Atomically claim the notification by setting status='accepted'.
  // Only one concurrent accept() call will match the pending row.
  const claim = await context.postgrest.client
    .from("Notification")
    .update({
      status: "accepted" satisfies NotificationStatus,
      respondedAt: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claim.error) {
    throw claim.error;
  }

  if (claim.data === null) {
    throw new Error("This notification has already been acted on");
  }

  // Revert the status if the side effect below fails, so the user may retry.
  const revertStatus = async () => {
    const revert = await context.postgrest.client
      .from("Notification")
      .update({
        status: "pending" satisfies NotificationStatus,
        respondedAt: null,
      })
      .eq("id", notificationId);

    if (revert.error) {
      console.error(
        `Failed to revert notification ${notificationId} to pending:`,
        revert.error
      );
    }
  };

  // Auto-decline helper — used when the referenced entity no longer exists.
  // The notification was already claimed (accepted), so we overwrite to declined.
  const autoDecline = async () => {
    await context.postgrest.client
      .from("Notification")
      .update({
        status: "declined" satisfies NotificationStatus,
        respondedAt: new Date().toISOString(),
      })
      .eq("id", notificationId);
  };

  // Wrap side effects so every failure path reverts the atomic claim.
  try {
    await performAcceptSideEffect({
      notification: notification.data,
      userId,
      targetWorkspaceId,
      autoDecline,
      context,
    });
  } catch (error) {
    // Auto-decline errors already set their own status — only revert others.
    if (error instanceof AutoDeclinedError) {
      throw error;
    }
    await revertStatus();
    throw error;
  }
};

/**
 * Sentinel thrown when the notification was auto-declined because the
 * referenced entity (workspace / project) no longer exists.
 */
class AutoDeclinedError extends Error {}

const performAcceptSideEffect = async ({
  notification,
  userId,
  targetWorkspaceId,
  autoDecline,
  context,
}: {
  notification: { type: string; senderId: string; payload: unknown };
  userId: string;
  targetWorkspaceId: string | undefined;
  autoDecline: () => Promise<void>;
  context: AppContext;
}) => {
  if (notification.type === "workspaceInvite") {
    const parseResult = WorkspaceInvitePayload.safeParse(notification.payload);
    if (parseResult.success === false) {
      throw new Error("Invalid workspace invite payload");
    }
    const parsed = parseResult.data;

    // Verify the workspace still exists
    const workspace = await context.postgrest.client
      .from("Workspace")
      .select("id")
      .eq("id", parsed.workspaceId)
      .eq("isDeleted", false)
      .maybeSingle();

    if (workspace.error) {
      throw workspace.error;
    }

    if (workspace.data === null) {
      await autoDecline();
      throw new AutoDeclinedError("This workspace no longer exists");
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
    return;
  }

  if (notification.type === "projectTransfer") {
    if (userId === notification.senderId) {
      throw new Error("You cannot accept your own transfer request");
    }

    const parseResult = ProjectTransferPayload.safeParse(notification.payload);
    if (parseResult.success === false) {
      throw new Error("Invalid project transfer payload");
    }
    const parsed = parseResult.data;

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
      await autoDecline();
      throw new AutoDeclinedError("This project no longer exists");
    }

    // Verify the sender still owns the project
    if (project.data.userId !== notification.senderId) {
      await autoDecline();
      throw new AutoDeclinedError("The sender no longer owns this project");
    }

    // Check receiver's plan limit before accepting the transfer
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

    // Block transfer if the project has custom domains and the receiver's plan
    // does not include domain support.
    if (receiverPlan.maxDomainsAllowedPerUser === 0) {
      const domainCount = await context.postgrest.client
        .from("ProjectDomain")
        .select("domainId", { count: "exact", head: true })
        .eq("projectId", parsed.projectId);

      if (domainCount.error) {
        throw domainCount.error;
      }

      if (
        receiverPlan.maxDomainsAllowedPerUser === 0 &&
        (domainCount.count ?? 0) > 0
      ) {
        throw new Error(
          "This project has custom domains attached. Upgrade your plan to accept projects with custom domains."
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
        .eq("isDeleted", false)
        .maybeSingle();

      if (workspace.error) {
        throw workspace.error;
      }

      if (workspace.data === null) {
        await autoDecline();
        throw new AutoDeclinedError("This workspace no longer exists");
      }

      if (workspace.data.userId !== userId) {
        throw new AuthorizationError(
          "You can only transfer projects into your own workspaces"
        );
      }

      console.info(
        `Project ownership change (transfer accepted): project=${parsed.projectId} from=${notification.senderId} to=${userId} workspace=${resolvedWorkspaceId}`
      );

      const updateResult = await context.postgrest.client
        .from("Project")
        .update({ userId, workspaceId: resolvedWorkspaceId })
        .eq("id", parsed.projectId)
        .select("id")
        .single();

      if (updateResult.error) {
        throw new Error("Failed to reassign the project");
      }
      return;
    }

    // No workspace specified — assign to receiver's default workspace
    const defaultWorkspace = await context.postgrest.client
      .from("Workspace")
      .select("id")
      .eq("userId", userId)
      .eq("isDefault", true)
      .eq("isDeleted", false)
      .maybeSingle();

    if (defaultWorkspace.error) {
      throw defaultWorkspace.error;
    }

    console.info(
      `Project ownership change (transfer accepted): project=${parsed.projectId} from=${notification.senderId} to=${userId} workspace=${defaultWorkspace.data?.id ?? "default"}`
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
};

export const decline = async (
  { notificationId }: { notificationId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  // Atomic update — only succeeds if still pending, preventing
  // a race where a concurrent accept() already claimed the row.
  const result = await context.postgrest.client
    .from("Notification")
    .update({
      status: "declined" satisfies NotificationStatus,
      respondedAt: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("recipientId", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (result.error) {
    throw result.error;
  }

  if (result.data === null) {
    throw new Error("Notification not found or already acted on");
  }
};

export const cancel = async (
  { notificationId }: { notificationId: string },
  context: AppContext
) => {
  const userId = assertUser(context);

  // Atomic update — only succeeds if still pending, preventing
  // a race where a concurrent accept() already claimed the row.
  const cancelResult = await context.postgrest.client
    .from("Notification")
    .update({
      status: "declined" satisfies NotificationStatus,
      respondedAt: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("senderId", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (cancelResult.error) {
    throw cancelResult.error;
  }

  if (cancelResult.data === null) {
    throw new Error("Notification not found or already acted on");
  }
};

export const __testing__ = { describeNotification };
