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

export const memberRelations = [
  "viewers",
  "editors",
  "builders",
  "administrators",
] as const;

export type MemberRelation = (typeof memberRelations)[number];

/** Safest default when relation is unknown — principle of least privilege */
export const defaultMemberRelation: MemberRelation = "viewers";

export const memberRelationLabels: Record<MemberRelation, string> = {
  viewers: "Viewer",
  editors: "Editor",
  builders: "Builder",
  administrators: "Admin",
};
