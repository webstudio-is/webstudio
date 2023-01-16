import { router } from "./trpc";
import { authorizationRouter } from "./authorization-router";

export const sharedRouter = router({
  authorize: authorizationRouter,
});

export type SharedRouter = typeof sharedRouter;
