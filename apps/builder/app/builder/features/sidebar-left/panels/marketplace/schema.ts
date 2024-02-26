import { z } from "zod";

const Base = z.object({
  id: z.string(),
  label: z.string(),
  publishedUrl: z.string(),
  authToken: z.string(),
  projectId: z.string(),
});

const TemplatesProduct = Base.extend({
  category: z.literal("templates"),
});

// Will add an AppProduct later.
export const MarketplaceProduct = TemplatesProduct;
export type MarketplaceProduct = z.infer<typeof MarketplaceProduct>;
