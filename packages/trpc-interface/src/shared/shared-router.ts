import type { createTRPCProxyClient } from "@trpc/client";
import { router } from "./trpc";
import { authorizationRouter } from "./authorization-router";
import { domainRouter } from "./domain";

export const sharedRouter = router({
  authorize: authorizationRouter,
  domain: domainRouter,
});

export type SharedRouter = typeof sharedRouter;

export type TrpcInterfaceClient = ReturnType<
  typeof createTRPCProxyClient<SharedRouter>
>;
