import { useFetcher } from "@remix-run/react";
import type {
  AnyMutationProcedure,
  AnyRouter,
  inferRouterInputs,
  inferRouterOutputs,
} from "@trpc/server";
// eslint-disable-next-line import/no-internal-modules
import { createRecursiveProxy } from "@trpc/server/shared";
import { useCallback, useEffect, useRef } from "react";

/** @deprecated use ~/shared/trpc-client instead */
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
