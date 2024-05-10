import type { AppRouter } from "~/services/trcp-router.server";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

import type {
  AnyMutationProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";
import { createRecursiveProxy } from "@trpc/server/shared";
import { useMemo, useState } from "react";
import { $authToken } from "../nano-states";

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/trpc",
      // You can pass any HTTP headers you wish here
      async headers(opts) {
        const authToken = $authToken.get();

        // Pass token to api call
        return {
          "x-auth-token": authToken,
        };
      },
    }),
  ],
});

type Procedures<T> = T extends AnyRouter
  ? {
      [Procedure in keyof T["_def"]["record"]]: T["_def"]["record"][Procedure] extends AnyMutationProcedure
        ? {
            useMutation: () => {
              send: (
                input: inferRouterInputs<T>[Procedure],
                onSuccess?: (data: inferRouterOutputs<T>[Procedure]) => void
              ) => void;
              data?: inferRouterOutputs<T>[Procedure];
              state: "idle" | "submitting";
              error?: string | undefined;
            };
          }
        : {
            useQuery: () => {
              load: (
                input: inferRouterInputs<T>[Procedure],
                onSuccess?: (data: inferRouterOutputs<T>[Procedure]) => void
              ) => void;
              data?: inferRouterOutputs<T>[Procedure];
              state: "idle" | "submitting";
              error?: string | undefined;
            };
          };
    }
  : never;

type Client = Record<
  string,
  Record<
    string,
    { query: (args: unknown) => unknown; mutate: (args: unknown) => unknown }
  >
>;

export const trpcClient: {
  [SubRoute in keyof AppRouter["_def"]["record"]]: Procedures<
    AppRouter["_def"]["record"][SubRoute]
  >;
} = createRecursiveProxy((options) => {
  const path = [...options.path];
  const hook = path.pop();
  const [data, setData] = useState<unknown>(undefined);
  const [state, setState] = useState<"idle" | "submitting">("idle");
  const [error, setError] = useState<string | undefined>(undefined);

  if (hook !== "useMutation" && hook !== "useQuery") {
    throw new Error(`Invalid hook ${hook}`);
  }

  // const method = path.join(".");
  if (path.length !== 2) {
    throw new Error(`Invalid path ${path}`);
  }

  const [namespace, method] = path;

  const submit = useMemo(() => {
    let requestId = 0;

    return async (input: never, onSuccess?: (data: unknown) => void) => {
      requestId += 1;
      const currentRequestId = requestId;
      try {
        setState("submitting");

        // if (process.env.NODE_ENV !== "production") {
        // await new Promise((resolve) => setTimeout(resolve, 1000));
        // }

        const result = await (client as unknown as Client)[namespace][method][
          hook === "useMutation" ? "mutate" : "query"
        ](input);

        // Newer request has been made, ignore this one
        // In the future to support optimistic updates we can call onComplete with the requestId order
        if (currentRequestId !== requestId) {
          return;
        }

        setData(result);
        setError(undefined);
        onSuccess?.(result);
      } catch (error) {
        if (currentRequestId !== requestId) {
          return;
        }

        console.error("TRPC ERROR", error);

        if (error instanceof Error) {
          setError(error.message);
          return;
        }
        setError("Unknown error");
      } finally {
        if (currentRequestId === requestId) {
          setState("idle");
        }
      }
    };
  }, [hook, namespace, method]);

  return {
    [hook === "useMutation" ? "send" : "load"]: submit,
    data: data,
    state,
    error,
  };
}) as never;
