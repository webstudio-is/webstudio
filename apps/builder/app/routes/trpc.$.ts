import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { ActionFunctionArgs } from "@remix-run/server-runtime";
import { createContext } from "~/shared/context.server";
import { appRouter } from "~/services/trcp-router.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // https://trpc.io/docs/server/adapters/fetch
  const response = await fetchRequestHandler({
    req: request,
    router: appRouter,
    endpoint: "/trpc",
    batching: { enabled: true },
    responseMeta(opts) {
      // Disable trpc cache
      if (process.env.NODE_ENV !== "production") {
        return {};
      }

      // tRPC batches multiple requests into a single network call.
      // The `paths` array lists all request paths included in the batch.
      const { paths, errors, type, ctx } = opts;

      if (paths === undefined) {
        return {};
      }

      if (type !== "query") {
        // Only queries can be cached
        return {};
      }

      if (errors.length > 0) {
        // Errors should not be cached
        return {};
      }

      // To enable efficient batching of tRPC requests,
      // adopt the least max age among all paths for caching, or disable caching entirely if no max-age is set.
      let minMaxAge = Number.MAX_SAFE_INTEGER;
      for (const path of paths) {
        const maxAge = ctx?.trpcCache.getMaxAge(path);

        if (maxAge === undefined) {
          return {};
        }

        minMaxAge = Math.min(minMaxAge, maxAge);
      }

      // Cap the max age at 1 hour
      minMaxAge = Math.min(minMaxAge, 60 * 60);

      return {
        headers: {
          "Cache-Control": `public, max-age=${minMaxAge}, s-maxage=${minMaxAge}`,
        },
      };
    },
    async createContext(opts) {
      return await createContext(opts.req);
    },
  });

  return response;
};

export const loader = action;
