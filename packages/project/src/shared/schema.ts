import { z } from "zod";

const MIN_TITLE_LENGTH = 2;

export const Title = z
  .string()
  .refine(
    (val) => val.length >= MIN_TITLE_LENGTH,
    `Minimum ${MIN_TITLE_LENGTH} characters required`
  );

export const MarketplaceApprovalStatus = z.enum([
  "UNLISTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export type MarketplaceApprovalStatus = z.infer<
  typeof MarketplaceApprovalStatus
>;

export const workspaceRelations = [
  "viewers",
  "editors",
  "builders",
  "administrators",
] as const;

export type WorkspaceRelation = (typeof workspaceRelations)[number];

/** Safest default when relation is unknown — principle of least privilege */
export const defaultWorkspaceRelation: WorkspaceRelation = "viewers";

export const workspaceRelationLabels: Record<WorkspaceRelation, string> = {
  viewers: "Viewer",
  editors: "Editor",
  builders: "Builder",
  administrators: "Admin",
};

// ── Notifications ──

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
  relation: z.enum(workspaceRelations),
});

export type WorkspaceInvitePayload = z.infer<typeof WorkspaceInvitePayload>;

export const ProjectTransferPayload = z.object({
  projectId: z.string(),
  targetWorkspaceId: z.string().optional(),
});

export type ProjectTransferPayload = z.infer<typeof ProjectTransferPayload>;
