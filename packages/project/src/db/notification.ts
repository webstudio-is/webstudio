import {
  type AppContext,
  AuthorizationError,
} from "@webstudio-is/trpc-interface/index.server";
import {
  type NotificationType,
  type NotificationStatus,
  NOTIFICATION_TTL_MS,
  WorkspaceInvitePayload,
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
): Promise<void> => {
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
  if (type === "workspace_invite" && (existing.count ?? 0) > 0) {
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
      return;
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

  // Resolve workspace names for workspace_invite notifications
  const workspaceIds = result.data
    .filter((n) => n.type === "workspace_invite")
    .map((n) => {
      const parsed = WorkspaceInvitePayload.safeParse(n.payload);
      return parsed.success ? parsed.data.workspaceId : undefined;
    })
    .filter((id): id is string => id !== undefined);

  const uniqueWorkspaceIds = [...new Set(workspaceIds)];

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

  return result.data.map((n) => {
    const sender = usersById.get(n.senderId);
    let workspaceName: string | undefined;

    if (n.type === "workspace_invite") {
      const parsed = WorkspaceInvitePayload.safeParse(n.payload);
      if (parsed.success) {
        workspaceName = workspacesById.get(parsed.data.workspaceId)?.name;
      }
    }

    return {
      id: n.id,
      type: n.type,
      status: n.status,
      payload: n.payload as Record<string, unknown>,
      createdAt: n.createdAt,
      senderEmail: sender?.email ?? "",
      senderName: sender?.username ?? "",
      workspaceName,
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
  { notificationId }: { notificationId: string },
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
  if (notification.data.type === "workspace_invite") {
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
        .eq("id", notificationId);

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

  // Mark as accepted
  const update = await context.postgrest.client
    .from("Notification")
    .update({
      status: "accepted" satisfies NotificationStatus,
      respondedAt: new Date().toISOString(),
    })
    .eq("id", notificationId);

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
    .eq("id", notificationId);

  if (result.error) {
    throw result.error;
  }
};
