import { describe, expect, test } from "vitest";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import {
  procedure,
  router,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import { throwApiError } from "./api-errors.server";

describe("api errors", () => {
  test("throws public api trpc errors", () => {
    expect.assertions(2);
    try {
      throwApiError("NOT_FOUND", "Missing");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: "NOT_FOUND",
        message: "Missing",
        cause: { webstudioCode: "NOT_FOUND" },
      });
    }
  });

  test("a missing record does not become a CLI version mismatch", async () => {
    const response = await fetchRequestHandler({
      endpoint: "/trpc",
      req: new Request("http://localhost/trpc/missing"),
      router: router({
        missing: procedure.query(() => {
          throwApiError("NOT_FOUND", "Publish job not found");
        }),
      }),
      createContext: () =>
        ({
          apiClient: { type: "cli" },
          trpcCache: { setMaxAge: () => {} },
        }) as unknown as AppContext,
    });

    expect(response.status).toBe(404);
    const body = (await response.json()) as {
      error: { data: Record<string, unknown> };
    };
    expect(body.error.data.webstudioCode).toBe("NOT_FOUND");
    expect(body.error.data).not.toHaveProperty("apiCompatibility");
  });
});
