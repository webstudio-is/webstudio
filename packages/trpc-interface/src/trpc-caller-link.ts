import { AnyRouter } from "@trpc/server";
// eslint-disable-next-line import/no-internal-modules
import { observable } from "@trpc/server/observable";
import { TRPCClientError, TRPCLink } from "@trpc/client";

type MemoryLinkOptions<TemplateRouter extends AnyRouter> = {
  appRouter: TemplateRouter;
  createContext?: () => TemplateRouter["_def"]["_config"]["$types"]["ctx"];
};

/**
 * https://github.com/trpc/trpc/issues/3335
 *
 * createCaller and createTRPCProxyClient provides different interfaces,
 * here we provide callerLink which can be used as a [trpc client link](https://trpc.io/docs/links)
 * Allowing us to call router api without http but through createTRPCProxyClient interface
 * See trpc-caller-link.test.ts for details
 **/
export const callerLink = <TemplateRouter extends AnyRouter>(
  opts: MemoryLinkOptions<TemplateRouter>
): TRPCLink<TemplateRouter> => {
  const { appRouter, createContext } = opts;

  return (runtime) =>
    ({ op }) =>
      observable((observer) => {
        const caller = appRouter.createCaller(createContext?.() ?? {});
        const { path, input } = op;

        const paths = path.split(".");

        let localCaller = caller as unknown as (
          arg: unknown
        ) => Promise<unknown>;

        for (const functionName of paths) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          localCaller = localCaller[functionName];
        }

        const promise = localCaller(input);

        promise
          .then((data) => {
            observer.next({
              result: { data },
            });
            observer.complete();
          })
          .catch((cause) => observer.error(TRPCClientError.from(cause)));

        return () => {
          // nothing to cancel
        };
      });
};
