import { describe, expect, test } from "vitest";
import {
  normalizePatchRequest,
  type PatchData,
} from "./patch-normalize.server";

const transaction = {
  id: "tx-1",
  object: "server",
  payload: [{ namespace: "props", patches: [] }],
};

describe("normalizePatchRequest", () => {
  test("normalizes browser transactions into per-transaction entries with the current context", () => {
    const context = { authorization: { type: "user", userId: "user-1" } };
    const data: PatchData = {
      buildId: "build-1",
      projectId: "project-1",
      version: 3,
      entries: [{ transaction }],
    };

    expect(
      normalizePatchRequest(data, () => ({
        type: "context",
        context: context as never,
      }))
    ).toEqual({
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 3,
      entries: [
        {
          transaction,
          writer: { type: "context", context: context as never },
        },
      ],
    });
  });

  test("strips revise patches from normalized transactions", () => {
    const data = {
      buildId: "build-1",
      projectId: "project-1",
      version: 3,
      entries: [
        {
          transaction: {
            id: "tx-1",
            payload: [
              {
                namespace: "props",
                patches: [],
                revisePatches: [{ op: "remove", path: ["x"] }],
              },
            ],
          },
        },
      ],
    };

    expect(
      normalizePatchRequest(data as never, () => ({
        type: "context",
        context: {} as never,
      })).entries[0].transaction
    ).toEqual({
      id: "tx-1",
      payload: [{ namespace: "props", patches: [] }],
    });
  });

  test("requires entries", () => {
    expect(() =>
      normalizePatchRequest(
        {
          buildId: "build-1",
          projectId: "project-1",
          version: 3,
        } as PatchData,
        () => ({ type: "context", context: {} as never })
      )
    ).toThrow("Transaction entries required");
  });

  test("normalizes relay entries with per-entry writer tokens", () => {
    const data = {
      buildId: "build-1",
      projectId: "project-1",
      version: 3,
      entries: [
        {
          seq: 1,
          authToken: "token-1",
          transaction,
        },
        {
          authToken: "token-2",
          transaction: { ...transaction, id: "tx-2" },
        },
      ],
    };

    expect(
      normalizePatchRequest(data, (entry) => ({
        type: "token",
        authToken: entry.authToken,
      }))
    ).toEqual({
      buildId: "build-1",
      projectId: "project-1",
      clientVersion: 3,
      entries: [
        {
          seq: 1,
          transaction,
          writer: { type: "token", authToken: "token-1" },
        },
        {
          transaction: { ...transaction, id: "tx-2" },
          writer: { type: "token", authToken: "token-2" },
        },
      ],
    });
  });

  test("requires non-empty entries", () => {
    expect(() =>
      normalizePatchRequest(
        {
          buildId: "build-1",
          projectId: "project-1",
          version: 3,
          entries: [],
        },
        () => ({ type: "context", context: {} as never })
      )
    ).toThrow("Transaction entries required");
  });
});
