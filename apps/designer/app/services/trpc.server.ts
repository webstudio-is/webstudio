import { createTrpcProxyServiceClient } from "@webstudio-is/trpc-interface/server";

const TRPC_SERVER_URL = process.env.TRPC_SERVER_URL;
const TRPC_SERVER_API_TOKEN = process.env.TRPC_SERVER_API_TOKEN;

export const trpcClient = createTrpcProxyServiceClient(
  TRPC_SERVER_URL !== undefined && TRPC_SERVER_API_TOKEN !== undefined
    ? {
        url: TRPC_SERVER_URL,
        token: TRPC_SERVER_API_TOKEN,
      }
    : undefined
);
