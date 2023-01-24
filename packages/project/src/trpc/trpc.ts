import { initTRPC } from "@trpc/server";

//export const createContext = async (): {userId: string} => {
//  return {};
//};

export type Context = { userId: string }; //inferAsyncReturnType<typeof createContext>;

export const { router, procedure, middleware, mergeRouters } = initTRPC
  .context<Context>()
  .create();
