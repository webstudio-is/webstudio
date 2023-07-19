import { useFetcher } from "@remix-run/react";
import type {
  AnyMutationProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";
// eslint-disable-next-line import/no-internal-modules
import { createRecursiveProxy } from "@trpc/server/shared";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const createTrpcRemixProxy = <Router extends AnyRouter>(
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
          state: "idle" | "loading" | "submitting";
        };
      }
    : {
        useQuery: () => {
          load: (
            input: inferRouterInputs<Router>[Procedure],
            onSuccess?: (data: inferRouterOutputs<Router>[Procedure]) => void
          ) => void;
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

    const previousDataRef = useRef(data);
    const onSuccessRef = useRef<(data: unknown) => void>();

    // There's an occasional issue where React skips `useEffect(, [data])`, possibly due to a race condition.
    // To frequently replicate this issue:
    // 1. Open dashboard
    // 1. Create 20 projects
    // 2. Turn on CPU 6x slowdown in Chrome dev tools

    // Upon creating a new project, you'll find that it doesn't redirect to the new project page if dependency doesn't contain `state`.
    // The problem is that `useEffect` with only `data` or `data?.id` as a dependency is not triggered.

    // Some working fixes:
    // 1. Non-remix fetch - using createTrpcFetchProxy
    // 2. Use this code inside useEffect:
    //      if (ref.current !== data?.projectId) { doRedirect(); }; ref.current = data?.projectId;
    // 3. Use useState as shown below
    //
    // Some observations:
    // The issue seems related to the amount of rendering, possibly due to concurrent React's features.
    // It's also related to Remix's useFetcher, which may be using setState or something similar
    // in a way that's not compatible with concurrent React.
    useEffect(() => {
      if (data !== previousDataRef.current) {
        previousDataRef.current = data;
        onSuccessRef.current?.(data);
      }
    }, [data, state]);

    const remixSubmit = useCallback(
      (input: never, onSuccess: (data: unknown) => void) => {
        onSuccessRef.current = onSuccess;
        submit(
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
            body: JSON.stringify(input ?? null),
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
