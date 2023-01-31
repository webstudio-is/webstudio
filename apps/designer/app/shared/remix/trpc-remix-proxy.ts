import { useFetcher } from "@remix-run/react";
import type {
  AnyMutationProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";
// eslint-disable-next-line import/no-internal-modules
import { createRecursiveProxy } from "@trpc/server/shared";

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
  createRecursiveProxy((options) => {
    const path = [...options.path];
    const hook = path.pop();

    if (hook !== "useMutation" && hook !== "useQuery") {
      throw new Error(`Invalid hook ${hook}`);
    }

    const fetcher = useFetcher();

    const method = path.join(".");

    const submit = (input: never) => {
      return fetcher.submit(input, {
        method: hook === "useMutation" ? "post" : "get",
        action: getPath(method),
      });
    };

    return { submit, data: fetcher.data };
  }) as never;
