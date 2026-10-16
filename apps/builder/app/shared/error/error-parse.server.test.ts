import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import { TRPCError, type AnyRouter } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { procedure, router } from "@webstudio-is/trpc-interface/index.server";
import { expect, test } from "vitest";
import { z } from "zod";
import { parseError } from "./error-parse";

const createClient = (appRouter: AnyRouter) =>
  createTRPCUntypedClient({
    links: [
      httpBatchLink({
        url: "http://localhost/trpc",
        fetch: (input, init) =>
          fetchRequestHandler({
            req: new Request(input, init),
            endpoint: "/trpc",
            router: appRouter,
            createContext: () => ({ apiClient: { type: "browser" } }) as never,
          }),
      }),
    ],
  });

test.each(["Invalid email", "Enter a valid email address"])(
  "normalizes local and serialized validation errors consistently when wording changes: %s",
  async (emailMessage) => {
    const input = z.object({
      email: z.email(emailMessage),
      name: z.string().min(1, "Name is required"),
    });
    const appRouter = router({
      save: procedure.input(input).mutation(() => "saved"),
    });
    const values = { email: "invalid", name: "" };
    const remoteError = await createClient(appRouter)
      .mutation("save", values)
      .catch((error) => error);
    const local = input.safeParse(values);
    expect(local.success).toBe(false);
    const expected = {
      status: 400,
      message: `${emailMessage}, Name is required`,
    };
    expect(parseError(remoteError)).toEqual(expected);
    if (!local.success) {
      expect(parseError(local.error)).toEqual(expected);
    }
  }
);

test("preserves a serialized permission failure without validation issues", async () => {
  const appRouter = router({
    save: procedure.mutation(() => {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You cannot edit this project",
      });
    }),
  });
  const error = await createClient(appRouter)
    .mutation("save")
    .catch((error) => error);
  expect(parseError(error)).toEqual({
    status: 403,
    message: "You cannot edit this project",
  });
});
