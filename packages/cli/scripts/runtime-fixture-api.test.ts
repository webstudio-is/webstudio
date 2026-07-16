import { afterEach, describe, expect, test } from "vitest";
import {
  publicApiCommandByOperationId,
  runtimeFixturePermissions,
  startRuntimeFixtureApi,
} from "./runtime-fixture-api";

const closeCallbacks: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(closeCallbacks.splice(0).map((close) => close()));
});

describe("runtime fixture API", () => {
  test.each([
    {
      method: "GET",
      request: (origin: string) =>
        fetch(
          `${origin}/trpc/api.pages.list?input=${encodeURIComponent(
            JSON.stringify({ 0: { json: { limit: 3 } } })
          )}`
        ),
    },
    {
      method: "POST",
      request: (origin: string) =>
        fetch(`${origin}/trpc/api.pages.list`, {
          method: "POST",
          body: JSON.stringify({ 0: { json: { limit: 3 } } }),
        }),
    },
  ])("decodes $method tRPC input", async ({ request }) => {
    const api = await startRuntimeFixtureApi(
      async ({ operationPath, readInput }) => ({
        operationPath,
        input: await readInput(),
      })
    );
    closeCallbacks.push(api.close);

    const response = await request(api.origin);

    expect(await response.json()).toEqual([
      {
        result: {
          data: {
            operationPath: "pages.list",
            input: { limit: 3 },
          },
        },
      },
    ]);
  });

  test("returns a stable tRPC error envelope", async () => {
    const api = await startRuntimeFixtureApi(async () => {
      throw new Error("fixture failed");
    });
    closeCallbacks.push(api.close);

    const response = await fetch(`${api.origin}/trpc/api.pages.list`);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual([
      {
        error: {
          message: "fixture failed",
          code: -32603,
          data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
        },
      },
    ]);
  });

  test("derives permissions and command names from the public API contract", () => {
    expect(runtimeFixturePermissions.apiContract.operationIds).toContain(
      "publish.list"
    );
    expect(publicApiCommandByOperationId.get("pages.list")).toBe("list-pages");
  });
});
