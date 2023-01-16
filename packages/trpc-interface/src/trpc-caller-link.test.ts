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
  stringInput: procedure.input(z.string()).query(({ input }) => input),
  objectInput: procedure
    .input(z.object({ hello: z.string() }))
    .query(({ input }) => input),
  objectInputTransform: procedure
    .input(
      z
        .object({ hello: z.string() })
        .transform((obj) => ({ [obj.hello]: "hello" }))
    )
    .query(({ input }) => input),

  objectInputWithContext: procedure
    .input(z.object({ hello: z.string() }))
    .query(({ input, ctx }) => ({ ...ctx, ...input })),

  objectInputWithTransformedOutput: procedure
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

describe("trpc-caller-link", () => {
  test("direct call works", async () => {
    const res = await client.test.query();
    expect(res).toEqual(await caller.test());
  });

  test("namespace no input call", async () => {
    const res = await client.authorize.noInput.query();
    expect(res).toEqual(await caller.authorize.noInput());
  });

  test("namespace input string call", async () => {
    const res = await client.authorize.stringInput.query("world");
    expect(res).toEqual(await caller.authorize.stringInput("world"));
  });

  test("namespace input object call", async () => {
    const res = await client.authorize.objectInput.query({ hello: "world" });
    expect(res).toEqual(await caller.authorize.objectInput({ hello: "world" }));
  });

  test("namespace transformed input object call", async () => {
    const res = await client.authorize.objectInputTransform.query({
      hello: "world",
    });
    expect(res).toEqual(
      await caller.authorize.objectInputTransform({ hello: "world" })
    );
  });

  test("namespace input object with context call", async () => {
    const res = await client.authorize.objectInputWithContext.query({
      hello: "world",
    });
    expect(res).toEqual(
      await caller.authorize.objectInputWithContext({ hello: "world" })
    );
  });

  test("namespace input object with output transform", async () => {
    const res = await client.authorize.objectInputWithTransformedOutput.query({
      hello: "world",
    });
    expect(res).toEqual(
      await caller.authorize.objectInputWithTransformedOutput({
        hello: "world",
      })
    );
  });

  test("namespace mutation input object with output transform", async () => {
    const res = await client.authorize.mutateNoInput.mutate();
    expect(res).toEqual(await caller.authorize.mutateNoInput());
  });
});
