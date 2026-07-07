import { describe, expect, test } from "vitest";
import {
  stripRevisePatchesFromPayload,
  stripRevisePatchesFromTransaction,
} from "./transaction-utils";

describe("stripRevisePatchesFromPayload", () => {
  test("removes revisePatches from array payload entries", () => {
    const payload = [
      {
        namespace: "instances",
        patches: [{ op: "add", path: ["x"], value: 1 }],
        revisePatches: [{ op: "remove", path: ["x"] }],
      },
    ];

    expect(stripRevisePatchesFromPayload(payload)).toEqual([
      {
        namespace: "instances",
        patches: [{ op: "add", path: ["x"], value: 1 }],
      },
    ]);
  });
});

describe("stripRevisePatchesFromTransaction", () => {
  test("removes revisePatches from server payload entries", () => {
    const transaction = {
      id: "tx-1",
      object: "server",
      payload: [
        {
          namespace: "instances",
          patches: [{ op: "add", path: ["x"], value: 1 }],
          revisePatches: [{ op: "remove", path: ["x"] }],
        },
      ],
    };

    const stripped = stripRevisePatchesFromTransaction(transaction);

    expect(stripped.payload).toEqual([
      {
        namespace: "instances",
        patches: [{ op: "add", path: ["x"], value: 1 }],
      },
    ]);
  });

  test("keeps non-server transactions unchanged", () => {
    const transaction = {
      id: "tx-2",
      object: "client",
      payload: { selected: ["id-1"] },
    };

    const stripped = stripRevisePatchesFromTransaction(transaction);

    expect(stripped).toBe(transaction);
  });

  test("returns same object when no revisePatches exist", () => {
    const transaction = {
      id: "tx-3",
      object: "server",
      payload: [
        {
          namespace: "instances",
          patches: [{ op: "add", path: ["x"], value: 1 }],
        },
      ],
    };

    const stripped = stripRevisePatchesFromTransaction(transaction);

    expect(stripped).toBe(transaction);
  });
});
