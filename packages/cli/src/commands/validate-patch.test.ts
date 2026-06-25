import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { validatePatch } from "./validate-patch";

const readFile = vi.fn();
const dependencies = { readFile };

beforeEach(() => {
  readFile.mockReset();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("validates patch json and reports summary", async () => {
  readFile.mockResolvedValue(
    JSON.stringify({
      transactions: [
        {
          id: "tx-1",
          payload: [
            {
              namespace: "pages",
              patches: [
                {
                  op: "replace",
                  path: ["meta", "siteName"],
                  value: "Site",
                },
              ],
            },
            {
              namespace: "instances",
              patches: [{ op: "remove", path: ["instance-id"] }],
            },
          ],
        },
      ],
    })
  );

  await validatePatch(
    {
      baseVersion: 7,
      input: "patch.json",
      json: true,
    },
    dependencies
  );

  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: true,
    data: {
      valid: true,
      baseVersion: 7,
      transactionCount: 1,
      patchCount: 2,
      namespaces: ["pages", "instances"],
    },
    meta: {
      command: "validate-patch",
    },
  });
});

test("reports invalid patch json as structured error", async () => {
  readFile.mockResolvedValue(
    JSON.stringify([
      { id: "tx-1", payload: [{ namespace: "bad", patches: [] }] },
    ])
  );

  await expect(
    validatePatch(
      {
        baseVersion: 7,
        input: "patch.json",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: false,
    error: {
      code: "INVALID_PATCH",
      message: expect.stringContaining("Invalid patch JSON"),
    },
    meta: {
      command: "validate-patch",
    },
  });
});

test("requires values for add and replace patches", async () => {
  readFile.mockResolvedValue(
    JSON.stringify([
      {
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [{ op: "replace", path: ["meta", "siteName"] }],
          },
        ],
      },
    ])
  );

  await expect(
    validatePatch(
      {
        baseVersion: 7,
        input: "patch.json",
        json: true,
      },
      dependencies
    )
  ).rejects.toThrow("Handled CLI error");

  expect(JSON.parse(vi.mocked(console.log).mock.calls.at(-1)?.[0])).toEqual({
    ok: false,
    error: {
      code: "INVALID_PATCH",
      message: expect.stringContaining("Invalid patch JSON"),
    },
    meta: {
      command: "validate-patch",
    },
  });
});
