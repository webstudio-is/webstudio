import { z } from "zod";

const Base = z.object({
  name: z.string().refine((name) => name.length >= 2, {
    message: "Name requires at least 2 characterss",
  }),
  thumbnailAssetId: z.string(),
  description: z.string(),
  email: z.string().email(),
  website: z.string().url().optional(),
});

const TemplatesProduct = Base.extend({
  category: z.literal("templates"),
});

// Will add an AppProduct later.
export const MarketplaceProduct = TemplatesProduct;
export type MarketplaceProduct = z.infer<typeof MarketplaceProduct>;
