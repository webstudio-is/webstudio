import { describe, expect, test } from "vitest";
import {
  builderPatchChangeSchema,
  builderPatchSchema,
  builderPatchTransactionSchema,
  compactBuilderPatchPayload,
} from "./patch";

describe("builder patch contracts", () => {
  test("requires values for add and replace patches", () => {
    expect(
      builderPatchSchema.safeParse({ op: "add", path: ["prop-subtitle"] })
        .success
    ).toBe(false);
    expect(
      builderPatchSchema.safeParse({ op: "replace", path: ["prop-subtitle"] })
        .success
    ).toBe(false);
    expect(
      builderPatchSchema.safeParse({
        op: "remove",
        path: ["prop-subtitle"],
      }).success
    ).toBe(true);
  });

  test("parses transactions", () => {
    const transaction = builderPatchTransactionSchema.parse({
      id: "tx-1",
      payload: [
        {
          namespace: "props",
          patches: [
            {
              op: "add",
              path: ["prop-subtitle"],
              value: {
                id: "prop-subtitle",
                instanceId: "instance-root",
                name: "Subtitle",
                type: "string",
                value: "Subtitle",
              },
            },
          ],
        },
      ],
    });

    expect(transaction.payload.map((change) => change.namespace)).toEqual([
      "props",
    ]);
  });

  test("parses patch changes", () => {
    expect(
      builderPatchChangeSchema.parse({
        namespace: "props",
        patches: [{ op: "remove", path: ["prop-title"] }],
      })
    ).toEqual({
      namespace: "props",
      patches: [{ op: "remove", path: ["prop-title"] }],
    });
  });

  test("removes empty patch changes from payload", () => {
    expect(
      compactBuilderPatchPayload([
        { namespace: "pages", patches: [] },
        {
          namespace: "props",
          patches: [{ op: "remove", path: ["prop-title"] }],
        },
      ])
    ).toEqual([
      {
        namespace: "props",
        patches: [{ op: "remove", path: ["prop-title"] }],
      },
    ]);
  });
});
