import type { createTRPCProxyClient } from "@trpc/client";
import { router } from "./trpc";
import { domainRouter } from "./domain";
import { deploymentRouter } from "./deployment";

export const sharedRouter = router({
  domain: domainRouter,
  deployment: deploymentRouter,
});

export type SharedRouter = typeof sharedRouter;

export type TrpcInterfaceClient = ReturnType<
  typeof createTRPCProxyClient<SharedRouter>
>;
