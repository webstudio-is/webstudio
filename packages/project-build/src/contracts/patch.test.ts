import { describe, expect, test } from "vitest";
import {
  builderPatchChangeSchema,
  builderPatchSchema,
  builderPatchTransactionSchema,
  compactBuilderPatchPayload,
  appendOptionalPropertyPatch,
  type BuilderPatch,
  createOptionalPropertyPatch,
  hasGeneratedRecordWritePatch,
  restorePointPatchTransactionSchema,
} from "./patch";
import { builderNamespaces } from "./namespaces";

describe("builder patch contracts", () => {
  test("restore point transactions only replace namespace roots", () => {
    const transaction = {
      id: "restore",
      payload: [
        {
          namespace: "pages",
          patches: [{ op: "replace", path: [], value: {} }],
        },
      ],
    };

    expect(
      restorePointPatchTransactionSchema.safeParse(transaction).success
    ).toBe(true);
    expect(
      restorePointPatchTransactionSchema.safeParse({
        ...transaction,
        payload: [
          {
            namespace: "pages",
            patches: [{ op: "replace", path: ["pages"], value: new Map() }],
          },
        ],
      }).success
    ).toBe(false);
    expect(
      restorePointPatchTransactionSchema.safeParse({
        ...transaction,
        payload: [
          {
            namespace: "pages",
            patches: [{ op: "add", path: [], value: {} }],
          },
        ],
      }).success
    ).toBe(false);
    expect(
      restorePointPatchTransactionSchema.safeParse({
        ...transaction,
        payload: [
          {
            namespace: "assets",
            patches: [{ op: "replace", path: [], value: new Map() }],
          },
        ],
      }).success
    ).toBe(false);
    expect(
      restorePointPatchTransactionSchema.safeParse({
        ...transaction,
        payload: [],
      }).success
    ).toBe(false);
    expect(
      restorePointPatchTransactionSchema.safeParse({
        ...transaction,
        payload: [transaction.payload[0], transaction.payload[0]],
      }).success
    ).toBe(false);
  });

  test("creates patches for optional properties", () => {
    expect(
      createOptionalPropertyPatch({
        path: ["record", "field"],
        previous: undefined,
        next: "value",
      })
    ).toEqual({
      op: "add",
      path: ["record", "field"],
      value: "value",
    });
    expect(
      createOptionalPropertyPatch({
        path: ["record", "field"],
        previous: "value",
        next: "next",
      })
    ).toEqual({
      op: "replace",
      path: ["record", "field"],
      value: "next",
    });
    expect(
      createOptionalPropertyPatch({
        path: ["record", "field"],
        previous: "value",
        next: undefined,
      })
    ).toEqual({ op: "remove", path: ["record", "field"] });
    expect(
      createOptionalPropertyPatch({
        path: ["record", "field"],
        previous: "value",
        next: "value",
      })
    ).toBeUndefined();

    const patches: BuilderPatch[] = [];
    appendOptionalPropertyPatch(patches, {
      path: ["record", "field"],
      previous: undefined,
      next: "value",
    });
    appendOptionalPropertyPatch(patches, {
      path: ["record", "field"],
      previous: "value",
      next: "value",
    });
    expect(patches).toHaveLength(1);
  });

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
          namespace: "pages",
          patches: [
            {
              op: "replace",
              path: ["meta", "siteName"],
              value: "Acme",
            },
          ],
        },
      ],
    });

    expect(transaction.payload.map((change) => change.namespace)).toEqual([
      "pages",
    ]);
  });

  test("rejects raw patches that create or replace generated records", () => {
    const generatedRecordNamespaceChanges = builderNamespaces.flatMap(
      (namespace) =>
        namespace === "pages" ||
        namespace === "projectSettings" ||
        namespace === "marketplaceProduct"
          ? []
          : [
              {
                namespace,
                patches: [
                  {
                    op: "add" as const,
                    path: [],
                    value: {},
                  },
                  {
                    op: "replace" as const,
                    path: [],
                    value: {},
                  },
                  {
                    op: "add" as const,
                    path: ["client-record-id"],
                    value: {},
                  },
                  {
                    op: "replace" as const,
                    path: ["existing-record-id"],
                    value: { id: "client-record-id" },
                  },
                ],
              },
            ]
    );
    const result = builderPatchTransactionSchema.safeParse({
      id: "tx-1",
      payload: [
        {
          namespace: "pages",
          patches: [
            {
              op: "add",
              path: [],
              value: {},
            },
            {
              op: "replace",
              path: [],
              value: {},
            },
            {
              op: "add",
              path: ["pages"],
              value: {},
            },
            {
              op: "replace",
              path: ["pages"],
              value: {},
            },
            {
              op: "add",
              path: ["folders"],
              value: {},
            },
            {
              op: "replace",
              path: ["folders"],
              value: {},
            },
            {
              op: "add",
              path: ["pages", "client-page-id"],
              value: {},
            },
            {
              op: "replace",
              path: ["pages", "existing-page-id"],
              value: { id: "client-page-id" },
            },
            {
              op: "add",
              path: ["folders", "client-folder-id"],
              value: {},
            },
            {
              op: "replace",
              path: ["folders", "existing-folder-id"],
              value: { id: "client-folder-id" },
            },
          ],
        },
        ...generatedRecordNamespaceChanges,
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["payload", 0, "patches", 0, "path"],
      ["payload", 0, "patches", 1, "path"],
      ["payload", 0, "patches", 2, "path"],
      ["payload", 0, "patches", 3, "path"],
      ["payload", 0, "patches", 4, "path"],
      ["payload", 0, "patches", 5, "path"],
      ["payload", 0, "patches", 6, "path"],
      ["payload", 0, "patches", 7, "path"],
      ["payload", 0, "patches", 8, "path"],
      ["payload", 0, "patches", 9, "path"],
      ...generatedRecordNamespaceChanges.flatMap((_, index) => [
        ["payload", index + 1, "patches", 0, "path"],
        ["payload", index + 1, "patches", 1, "path"],
        ["payload", index + 1, "patches", 2, "path"],
        ["payload", index + 1, "patches", 3, "path"],
      ]),
    ]);
  });

  test("detects generated record writes in patch payloads", () => {
    expect(
      hasGeneratedRecordWritePatch([
        {
          namespace: "pages",
          patches: [{ op: "replace", path: [], value: {} }],
        },
      ])
    ).toBe(true);
    expect(
      hasGeneratedRecordWritePatch([
        {
          namespace: "pages",
          patches: [
            {
              op: "replace",
              path: ["pages", "page-id", "name"],
              value: "Home",
            },
          ],
        },
      ])
    ).toBe(false);
    expect(
      hasGeneratedRecordWritePatch([
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: ["prop-id"],
              value: { id: "prop-id", name: "Title" },
            },
          ],
        },
      ])
    ).toBe(false);
    expect(
      hasGeneratedRecordWritePatch([
        {
          namespace: "props",
          patches: [
            {
              op: "replace",
              path: ["prop-id"],
              value: { id: "other-prop-id", name: "Title" },
            },
          ],
        },
      ])
    ).toBe(true);
  });

  test("allows replacing generated records when the record id is preserved", () => {
    expect(
      builderPatchTransactionSchema.safeParse({
        id: "tx-1",
        payload: [
          {
            namespace: "pages",
            patches: [
              {
                op: "replace",
                path: ["pages", "page-id"],
                value: { id: "page-id", name: "Home" },
              },
            ],
          },
          {
            namespace: "props",
            patches: [
              {
                op: "replace",
                path: ["prop-id"],
                value: { id: "prop-id", name: "Title" },
              },
            ],
          },
        ],
      }).success
    ).toBe(true);
  });

  test("rejects raw patches that mutate generated record id fields", () => {
    const generatedRecordNamespaceChanges = builderNamespaces.flatMap(
      (namespace) =>
        namespace === "pages" ||
        namespace === "projectSettings" ||
        namespace === "marketplaceProduct"
          ? []
          : [
              {
                namespace,
                patches: [
                  {
                    op: "replace" as const,
                    path: ["record-id", "id"],
                    value: "other-id",
                  },
                ],
              },
            ]
    );
    const result = builderPatchTransactionSchema.safeParse({
      id: "tx-1",
      payload: [
        {
          namespace: "pages",
          patches: [
            {
              op: "replace",
              path: ["pages", "page-id", "id"],
              value: "other-page-id",
            },
            { op: "remove", path: ["folders", "folder-id", "id"] },
          ],
        },
        ...generatedRecordNamespaceChanges,
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["payload", 0, "patches", 0, "path"],
      ["payload", 0, "patches", 1, "path"],
      ...generatedRecordNamespaceChanges.map((_, index) => [
        "payload",
        index + 1,
        "patches",
        0,
        "path",
      ]),
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
