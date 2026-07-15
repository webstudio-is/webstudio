import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { expect, test } from "vitest";
import type { AppContext } from "./context.server";
import { procedure, router } from "./router.server";

class ProjectNotPublishedError extends Error {
  webstudioCode = "PROJECT_NOT_PUBLISHED" as const;
}

const createContext = (): AppContext =>
  ({
    apiClient: { type: "cli", version: undefined },
    trpcCache: {
      setMaxAge: () => {},
      getMaxAge: () => undefined,
    },
  }) as unknown as AppContext;

test("includes webstudio error codes in formatted tRPC errors", async () => {
  const appRouter = router({
    fail: procedure.query(() => {
      throw new ProjectNotPublishedError("Not published");
    }),
  });

  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: new Request("http://localhost/trpc/fail"),
    router: appRouter,
    createContext,
  });

  expect(response.status).toBe(500);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      data: {
        code: "INTERNAL_SERVER_ERROR",
        webstudioCode: "PROJECT_NOT_PUBLISHED",
      },
    },
  });
});

test("includes structured validation issues in formatted tRPC errors", async () => {
  const issue = {
    code: "invalid_type",
    path: ["name"],
    message: "Expected string",
    constraint: "type:string",
  };
  const appRouter = router({
    fail: procedure.query(() => {
      throw new TRPCError({
        code: "BAD_REQUEST",
        cause: Object.assign(new Error("Invalid input"), {
          webstudioCode: "INVALID_INPUT",
          issues: [issue],
        }),
      });
    }),
  });

  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: new Request("http://localhost/trpc/fail"),
    router: appRouter,
    createContext,
  });

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: {
      data: {
        code: "BAD_REQUEST",
        webstudioCode: "INVALID_INPUT",
        issues: [issue],
      },
    },
  });
});
