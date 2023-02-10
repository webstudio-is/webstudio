import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import {
  sharedRouter,
  TrpcInterfaceClient,
  type SharedRouter,
} from "./shared-router";
import { callerLink } from "../trpc-caller-link";

type SharedClientOptions = {
  url: string;
  token: string;
  branchName: string | undefined;
};

export const createTrpcProxyServiceClient = (
  options?: SharedClientOptions | undefined
): TrpcInterfaceClient => {
  if (options !== undefined) {
    const remoteClient = createTRPCProxyClient<SharedRouter>({
      links: [
        httpBatchLink({
          url: options.url,
          headers: () => ({
            Authorization: options.token,
            // We use this header for SaaS preview service discovery proxy
            "x-branch-name": options.branchName,
          }),
        }),
      ],
    });

    return remoteClient;
  }

  const client = createTRPCProxyClient<SharedRouter>({
    links: [
      callerLink({
        appRouter: sharedRouter,
      }),
    ],
  });

  return client;
};
