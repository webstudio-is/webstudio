import { z } from "zod";

export const MarketplaceProduct = z.object({
  category: z.union([
    z.literal("sectionTemplates"),
    z.literal("pageTemplates"),
  ]),
  name: z.string().min(2).trim(),
  thumbnailAssetId: z.string(),
  author: z.string().min(2).trim(),
  email: z.string().email().trim(),
  website: z.union([z.string().url().trim().optional(), z.literal("")]),
  issues: z.union([z.string().url().trim().optional(), z.literal("")]),
  description: z.string().trim().min(10),
});
export type MarketplaceProduct = z.infer<typeof MarketplaceProduct>;

export const marketplaceCategories = new Map<
  MarketplaceProduct["category"],
  string
>([
  ["sectionTemplates", "Sections"],
  ["pageTemplates", "Pages"],
]);
