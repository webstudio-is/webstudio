import { z } from "zod";
import {
  procedure,
  router,
  createCacheMiddleware,
} from "@webstudio-is/trpc-interface/index.server";
import { getItems, getBuildProdData } from "./db.server";

const cacheMiddleware = createCacheMiddleware(60 * 3); // 60 * 3 = 3 minutes cache
const cachedProcedure = procedure.use(cacheMiddleware);

export const marketplaceRouter = router({
  getItems: cachedProcedure.query(async () => {
    return await getItems();
  }),
  getBuildData: cachedProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await getBuildProdData(input, ctx);
    }),
});
