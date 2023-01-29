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
