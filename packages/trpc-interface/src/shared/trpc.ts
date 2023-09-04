import { initTRPC, type inferAsyncReturnType } from "@trpc/server";

export const createContext = async () => {
  // Use any for typecheck at saas to not use ctx router types in satisfies constraints
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return {} as any;
};

export type Context = inferAsyncReturnType<typeof createContext>;

export const { router, procedure, middleware } = initTRPC
  .context<Context>()
  .create();
