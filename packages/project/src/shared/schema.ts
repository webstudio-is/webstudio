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
