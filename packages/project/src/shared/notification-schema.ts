import { z } from "zod";
import { roles } from "@webstudio-is/trpc-interface/authorize";

export const notificationTypes = [
  "workspaceInvite",
  "projectTransfer",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export const notificationStatuses = [
  "pending",
  "accepted",
  "declined",
] as const;

export type NotificationStatus = (typeof notificationStatuses)[number];

/** Notifications expire after this many milliseconds (7 days). */
export const NOTIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const WorkspaceInvitePayload = z.object({
  workspaceId: z.string(),
  relation: z.enum(roles),
});

export type WorkspaceInvitePayload = z.infer<typeof WorkspaceInvitePayload>;

export const ProjectTransferPayload = z.object({
  projectId: z.string(),
  targetWorkspaceId: z.string().optional(),
});

export type ProjectTransferPayload = z.infer<typeof ProjectTransferPayload>;
