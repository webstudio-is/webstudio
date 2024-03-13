// eslint-disable-next-line import/no-internal-modules
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { ActionArgs } from "@remix-run/node";
import { findAuthenticatedUser } from "~/services/auth.server";
import { createContext } from "~/shared/context.server";
import { appRouter } from "~/services/trcp-router.server";

export const action = async ({ request }: ActionArgs) => {
  const authenticatedUser = await findAuthenticatedUser(request);

  if (authenticatedUser === null) {
    throw new Error("Not authenticated");
  }

  // https://trpc.io/docs/server/adapters/fetch
  const response = await fetchRequestHandler({
    req: request,
    router: appRouter,
    endpoint: "/trpc",
    batching: { enabled: true },
    responseMeta(opts) {
      const { paths, errors, type } = opts;
      // @todo: Add caching headers if cacheMiddleware is not used
      console.info("responseMeta", { paths, errors, type });
      return {};
    },
    async createContext(opts) {
      return await createContext(opts.req);
    },
  });

  return response;
};

export const loader = action;
