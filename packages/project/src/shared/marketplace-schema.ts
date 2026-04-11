import { z } from "zod";

export const MarketplaceApprovalStatus = z.enum([
  "UNLISTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export type MarketplaceApprovalStatus = z.infer<
  typeof MarketplaceApprovalStatus
>;
