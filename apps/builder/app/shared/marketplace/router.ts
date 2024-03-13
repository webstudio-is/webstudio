import { z } from "zod";
import { procedure, router } from "@webstudio-is/trpc-interface/index.server";
import { getItems, getBuildProdData } from "./db.server";

export const marketplaceRouter = router({
  getItems: procedure.query(async () => {
    return await getItems();
  }),
  getBuildData: procedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getBuildProdData(input, ctx);
    }),
});

export type MarketplaceRouter = typeof marketplaceRouter;
