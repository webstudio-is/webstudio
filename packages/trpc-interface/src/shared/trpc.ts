import { initTRPC, type inferAsyncReturnType } from "@trpc/server";

export const createContext = async () => {
  return {};
};

export type Context = inferAsyncReturnType<typeof createContext>;

export const { router, procedure, middleware } = initTRPC
  .context<Context>()
  .create();
