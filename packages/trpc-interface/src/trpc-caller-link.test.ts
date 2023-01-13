import { initTRPC } from "@trpc/server";
import { describe, test, expect } from "@jest/globals";
import { callerLink } from "./trpc-caller-link";
import { createTRPCProxyClient } from "@trpc/client";
import { z } from "zod";

type Context = {
  someCtx: string;
};

export const { router, procedure, middleware } = initTRPC
  .context<Context>()
  .create();

const authorize = router({
  noInput: procedure.query(async () => "hello"),
  strInput: procedure.input(z.string()).query(({ input }) => input),
  objInput: procedure
    .input(z.object({ hello: z.string() }))
    .query(({ input }) => input),
  objInputTransform: procedure
    .input(
      z
        .object({ hello: z.string() })
        .transform((obj) => ({ [obj.hello]: "hello" }))
    )
    .query(({ input }) => input),

  objInputWContext: procedure
    .input(z.object({ hello: z.string() }))
    .query(({ input, ctx }) => ({ ...ctx, ...input })),

  objInputWTOutputTransform: procedure
    .input(z.object({ hello: z.string() }))
    .output(
      z
        .object({ hello: z.string(), someCtx: z.string() })
        .transform((obj) => ({ obj }))
    )
    .query(({ input, ctx }) => ({ ...ctx, ...input })),

  mutateNoInput: procedure.mutation(async () => "hello"),
});

const appRouter = router({
  test: procedure.query(async () => "hello"),
  authorize,
});

const contextValue = { someCtx: "hello" };

const client = createTRPCProxyClient<typeof appRouter>({
  links: [
    callerLink({
      appRouter,
      createContext: (): Context => contextValue,
    }),
  ],
});

const caller = appRouter.createCaller(contextValue);

describe("memory-link", () => {
  test("direct call works", async () => {
    const res = await client.test.query();
    expect(res).toEqual(await caller.test());
  });

  test("namespace no input call", async () => {
    const res = await client.authorize.noInput.query();
    expect(res).toEqual(await caller.authorize.noInput());
  });

  test("namespace input string call", async () => {
    const res = await client.authorize.strInput.query("world");
    expect(res).toEqual(await caller.authorize.strInput("world"));
  });

  test("namespace input object call", async () => {
    const res = await client.authorize.objInput.query({ hello: "world" });
    expect(res).toEqual(await caller.authorize.objInput({ hello: "world" }));
  });

  test("namespace transformed input object call", async () => {
    const res = await client.authorize.objInputTransform.query({
      hello: "world",
    });
    expect(res).toEqual(
      await caller.authorize.objInputTransform({ hello: "world" })
    );
  });

  test("namespace input object with context call", async () => {
    const res = await client.authorize.objInputWContext.query({
      hello: "world",
    });
    expect(res).toEqual(
      await caller.authorize.objInputWContext({ hello: "world" })
    );
  });

  test("namespace input object with output transform", async () => {
    const res = await client.authorize.objInputWTOutputTransform.query({
      hello: "world",
    });
    expect(res).toEqual(
      await caller.authorize.objInputWTOutputTransform({ hello: "world" })
    );
  });

  test("namespace mutation input object with output transform", async () => {
    const res = await client.authorize.mutateNoInput.mutate();
    expect(res).toEqual(await caller.authorize.mutateNoInput());
  });
});
