import { useFetcher } from "@remix-run/react";
import type {
  AnyMutationProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";

const proxy = (get: (method: string) => void) =>
  new Proxy({}, { get: (_target, method: string) => get(method) });

export const createTrpcRemixProxy = <Router extends AnyRouter>(
  getPath: (method: string) => string
): {
  [Procedure in keyof Router["_def"]["record"]]: Router["_def"]["record"][Procedure] extends AnyMutationProcedure
    ? {
        useMutation: () => {
          submit: (input: inferRouterInputs<Router>[Procedure]) => void;
          data?: inferRouterOutputs<Router>[Procedure];
        };
      }
    : {
        useQuery: () => {
          load: (input: inferRouterInputs<Router>[Procedure]) => void;
          data?: inferRouterOutputs<Router>[Procedure];
        };
      };
} =>
  proxy((method: string) =>
    proxy((prop) => () => {
      const fetcher = useFetcher();
      const submit = (input: never) => {
        return fetcher.submit(input, {
          method: prop === "useMutation" ? "post" : "get",
          action: getPath(method),
        });
      };
      return { submit, data: fetcher.data };
    })
  ) as never;
