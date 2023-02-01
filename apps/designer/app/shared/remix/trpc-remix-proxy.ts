import { useFetcher } from "@remix-run/react";
import type {
  AnyMutationProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";
// eslint-disable-next-line import/no-internal-modules
import { createRecursiveProxy } from "@trpc/server/shared";
import { useCallback } from "react";

export const createTrpcRemixProxy = <Router extends AnyRouter>(
  getPath: (method: string) => string
): {
  [Procedure in keyof Router["_def"]["record"]]: Router["_def"]["record"][Procedure] extends AnyMutationProcedure
    ? {
        useMutation: () => {
          send: (input: inferRouterInputs<Router>[Procedure]) => void;
          data?: inferRouterOutputs<Router>[Procedure];
          state: "idle" | "loading" | "submitting";
        };
      }
    : {
        useQuery: () => {
          load: (input: inferRouterInputs<Router>[Procedure]) => void;
          data?: inferRouterOutputs<Router>[Procedure];
          state: "idle" | "loading" | "submitting";
        };
      };
} =>
  createRecursiveProxy((options) => {
    const path = [...options.path];
    const hook = path.pop();
    const { data, submit, state } = useFetcher();

    if (hook !== "useMutation" && hook !== "useQuery") {
      throw new Error(`Invalid hook ${hook}`);
    }

    const method = path.join(".");

    const remixSubmit = useCallback(
      (input: never) => {
        return submit(
          // stringify input as otherwise we loose type safety
          // (remix will add key: values as FormData entries or as SearchParams
          { input: JSON.stringify(input) },
          {
            method: hook === "useMutation" ? "post" : "get",
            action: getPath(method),
          }
        );
      },
      [submit, hook, method]
    );

    return {
      [hook === "useMutation" ? "send" : "load"]: remixSubmit,
      data: data,
      state,
    };
  }) as never;
