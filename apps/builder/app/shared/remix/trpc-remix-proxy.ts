import { useFetcher } from "@remix-run/react";
import type {
  AnyMutationProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";
// eslint-disable-next-line import/no-internal-modules
import { createRecursiveProxy } from "@trpc/server/shared";
import { useCallback, useMemo, useState } from "react";

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

export const createTrpcFetchProxy = <Router extends AnyRouter>(
  getPath: (method: string) => string
): {
  [Procedure in keyof Router["_def"]["record"]]: Router["_def"]["record"][Procedure] extends AnyMutationProcedure
    ? {
        useMutation: () => {
          send: (
            input: inferRouterInputs<Router>[Procedure],
            onSuccess?: (data: inferRouterOutputs<Router>[Procedure]) => void
          ) => void;
          data?: inferRouterOutputs<Router>[Procedure];
          state: "idle" | "submitting";
          error?: string | undefined;
        };
      }
    : {
        useQuery: () => {
          load: (
            input: inferRouterInputs<Router>[Procedure],
            onSuccess?: (data: inferRouterOutputs<Router>[Procedure]) => void
          ) => void;
          data?: inferRouterOutputs<Router>[Procedure];
          state: "idle" | "submitting";
          error?: string | undefined;
        };
      };
} =>
  createRecursiveProxy((options) => {
    const path = [...options.path];
    const hook = path.pop();
    const [data, setData] = useState(undefined);
    const [state, setState] = useState<"idle" | "submitting">("idle");
    const [error, setError] = useState<string | undefined>(undefined);

    if (hook !== "useMutation" && hook !== "useQuery") {
      throw new Error(`Invalid hook ${hook}`);
    }

    const method = path.join(".");

    const submit = useMemo(() => {
      let requestId = 0;

      return async (input: never, onSuccess?: (data: unknown) => void) => {
        try {
          setState("submitting");
          requestId += 1;
          const currentRequestId = requestId;

          if (process.env.NODE_ENV !== "production") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          const response = await fetch(getPath(method), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(input),
          });

          // Newer request has been made, ignore this one
          // In the future to support optimistic updates we can call onComplete with the requestId order
          if (currentRequestId !== requestId) {
            return;
          }

          if (response.ok) {
            const data = await response.json();
            setData(data);
            setError(undefined);
            onSuccess?.(data);
            return;
          }

          // Error handling
          const message = await response.text();
          setError(message.slice(0, 200));
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message);
            return;
          }
          setError("Unknown error");
        } finally {
          setState("idle");
        }
      };
    }, [method]);

    return {
      [hook === "useMutation" ? "send" : "load"]: submit,
      data: data,
      state,
      error,
    };
  }) as never;
