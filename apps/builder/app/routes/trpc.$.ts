import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { createContext, isServiceAuthorization } from "~/shared/context.server";
import { appRouter } from "~/services/trcp-router.server";
import { preventCrossOriginCookie } from "~/services/no-cross-origin-cookie";
import { checkCsrf } from "~/services/csrf-session.server";
import { getTrpcResponseMeta } from "~/services/trpc-response-meta.server";

const isServiceRequest = (request: Request) => {
  return isServiceAuthorization(request.headers.get("Authorization"));
};

const isAuthTokenRequest = (request: Request) => {
  return request.headers.has("x-auth-token");
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (isServiceRequest(request) === false) {
    preventCrossOriginCookie(request);
    if (isAuthTokenRequest(request) === false) {
      await checkCsrf(request);
    }
  }

  // https://trpc.io/docs/server/adapters/fetch
  const response = await fetchRequestHandler({
    req: request,
    router: appRouter,
    endpoint: "/trpc",
    batching: { enabled: true },
    responseMeta(opts) {
      return getTrpcResponseMeta({
        ...opts,
        isProduction: process.env.NODE_ENV === "production",
      });
    },
    async createContext(opts) {
      return await createContext(opts.req);
    },
  });

  return response;
};

export const loader = action;
