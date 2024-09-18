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
