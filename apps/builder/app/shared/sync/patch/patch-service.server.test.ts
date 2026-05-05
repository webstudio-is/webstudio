import { beforeEach, describe, expect, test, vi } from "vitest";

const patchBuild = vi.hoisted(() => vi.fn());
const authorizePatchEntries = vi.hoisted(() => vi.fn());

vi.mock("@webstudio-is/project/index.server", () => ({
  patchBuild,
}));

vi.mock("./patch-auth.server", () => ({
  assertProjectPermit: vi.fn(),
  authorizePatchEntries,
  createWriterContext: vi.fn(),
}));

import { applyPatchRequest } from "./patch-service.server";
import type { NormalizedPatchRequest } from "./patch-normalize.server";

const createContext = () =>
  ({
    postgrest: {
      client: {
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { projectId: "project-1", version: 3 },
                error: undefined,
              }),
            }),
          }),
        }),
      },
    },
  }) as never;

const transaction = (id: string) => ({
  id,
  payload: [{ namespace: "props", patches: [] }],
});

const patch: NormalizedPatchRequest = {
  buildId: "build-1",
  projectId: "project-1",
  clientVersion: 3,
  entries: [
    {
      seq: 1,
      transaction: transaction("tx-1") as never,
      writer: { type: "token", authToken: "token-1" },
    },
    {
      seq: 2,
      transaction: transaction("tx-2") as never,
      writer: { type: "token", authToken: "token-2" },
    },
  ],
};

describe("applyPatchRequest", () => {
  beforeEach(() => {
    patchBuild.mockReset();
    authorizePatchEntries.mockReset();
  });

  test("returns per-entry partial results while applying authorized entries", async () => {
    authorizePatchEntries.mockResolvedValue({
      authorized: [{ entry: patch.entries[1], context: { writer: 2 } }],
      rejected: [
        {
          entry: patch.entries[0],
          errors: "You don't have permission to edit this project.",
        },
      ],
    });
    patchBuild.mockResolvedValue({ status: "ok", version: 4 });

    const result = await applyPatchRequest(createContext(), patch);

    expect(patchBuild).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions: [patch.entries[1].transaction],
      }),
      { writer: 2 }
    );
    expect(result).toEqual({
      status: "partial",
      version: 4,
      entries: [
        {
          seq: 1,
          transactionId: "tx-1",
          status: "rejected",
          errors: "You don't have permission to edit this project.",
        },
        { seq: 2, transactionId: "tx-2", status: "accepted" },
      ],
    });
  });

  test("falls back to per-entry apply when a mixed authorized batch fails", async () => {
    const context = { writer: 1 };
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: patch.entries[0], context },
        { entry: patch.entries[1], context },
      ],
      rejected: [],
    });
    patchBuild
      .mockResolvedValueOnce({ status: "error", errors: "batch failed" })
      .mockResolvedValueOnce({ status: "ok", version: 4 })
      .mockResolvedValueOnce({ status: "error", errors: "entry failed" });

    const result = await applyPatchRequest(createContext(), patch);

    expect(result).toEqual({
      status: "partial",
      version: 4,
      entries: [
        { seq: 1, transactionId: "tx-1", status: "accepted" },
        {
          seq: 2,
          transactionId: "tx-2",
          status: "failed",
          errors: "entry failed",
        },
      ],
    });
  });

  test("applies mixed writer entries with their own context without batching", async () => {
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: patch.entries[0], context: { writer: 1 } },
        { entry: patch.entries[1], context: { writer: 2 } },
      ],
      rejected: [],
    });
    patchBuild
      .mockResolvedValueOnce({ status: "ok", version: 4 })
      .mockResolvedValueOnce({ status: "ok", version: 5 });

    const result = await applyPatchRequest(createContext(), patch);

    expect(patchBuild).toHaveBeenCalledTimes(2);
    expect(patchBuild).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        clientVersion: 3,
        transactions: [patch.entries[0].transaction],
      }),
      { writer: 1 }
    );
    expect(patchBuild).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        clientVersion: 4,
        transactions: [patch.entries[1].transaction],
      }),
      { writer: 2 }
    );
    expect(result).toEqual({
      status: "ok",
      version: 5,
      entries: [
        { seq: 1, transactionId: "tx-1", status: "accepted" },
        { seq: 2, transactionId: "tx-2", status: "accepted" },
      ],
    });
  });

  test("preserves entry order when transaction ids are duplicated", async () => {
    const duplicatePatch: NormalizedPatchRequest = {
      ...patch,
      entries: [
        {
          seq: 1,
          transaction: transaction("tx-duplicate") as never,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          seq: 2,
          transaction: transaction("tx-duplicate") as never,
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    };
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: duplicatePatch.entries[1], context: { writer: 2 } },
      ],
      rejected: [
        {
          entry: duplicatePatch.entries[0],
          errors: "You don't have permission to edit this project.",
        },
      ],
    });
    patchBuild.mockResolvedValue({ status: "ok", version: 4 });

    const result = await applyPatchRequest(createContext(), duplicatePatch);

    expect(result).toEqual({
      status: "partial",
      version: 4,
      entries: [
        {
          seq: 1,
          transactionId: "tx-duplicate",
          status: "rejected",
          errors: "You don't have permission to edit this project.",
        },
        { seq: 2, transactionId: "tx-duplicate", status: "accepted" },
      ],
    });
  });

  test("does not convert thrown per-entry persistence errors into terminal entry failures", async () => {
    const context = { writer: 1 };
    authorizePatchEntries.mockResolvedValue({
      authorized: [
        { entry: patch.entries[0], context },
        { entry: patch.entries[1], context },
      ],
      rejected: [],
    });
    patchBuild
      .mockResolvedValueOnce({ status: "error", errors: "batch failed" })
      .mockResolvedValueOnce({ status: "ok", version: 4 })
      .mockRejectedValueOnce(new Error("PostgREST unavailable"));

    await expect(applyPatchRequest(createContext(), patch)).rejects.toThrow(
      "PostgREST unavailable"
    );
  });
});
