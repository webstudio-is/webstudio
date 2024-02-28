import { procedure, router } from "../trpc";
import { getItems } from "./db.server";

export const marketplaceRouter = router({
  getItems: procedure.query(async () => {
    return await getItems();
  }),
});
export type MarketplaceRouter = typeof marketplaceRouter;
