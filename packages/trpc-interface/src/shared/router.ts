import { router } from "./trpc";
import { authorize } from "./authorize";

export const sharedRouter = router({
  authorize,
});

export type SharedRouter = typeof sharedRouter;
