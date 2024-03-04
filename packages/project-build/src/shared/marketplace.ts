import { z } from "zod";

const Base = z.object({
  name: z.string().min(2).trim(),
  thumbnailAssetId: z.string(),
  author: z.string().min(2).trim(),
  email: z.string().email().trim(),
  website: z.union([z.string().url().trim().optional(), z.literal("")]),
  issues: z.union([z.string().url().trim().optional(), z.literal("")]),
  description: z.string().trim().min(10),
});

const TemplatesProduct = Base.extend({
  category: z.literal("sectionTemplates"),
});

// Will add an AppProduct later.
export const MarketplaceProduct = TemplatesProduct;
export type MarketplaceProduct = z.infer<typeof MarketplaceProduct>;
