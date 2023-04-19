import fetch from "node-fetch";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import {
  sharedRouter,
  type TrpcInterfaceClient,
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
          // httpBatchLink uses lib.dom.d.ts's fetch type
          // which is incompatible with node fetch type.
          fetch: fetch as never,
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
