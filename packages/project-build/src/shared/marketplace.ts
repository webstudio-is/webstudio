import { z } from "zod";

const Base = z.object({
  name: z.string().optional(),
  thumbnailAssetId: z.string().optional(),
  description: z.string().optional(),
  email: z.string().optional(),
  website: z.string().optional(),
});

const TemplatesProduct = Base.extend({
  category: z.literal("templates"),
});

// Will add an AppProduct later.
export const MarketplaceProduct = TemplatesProduct;
export type MarketplaceProduct = z.infer<typeof MarketplaceProduct>;
