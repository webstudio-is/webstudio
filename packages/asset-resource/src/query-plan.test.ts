import { describe, expect, test } from "vitest";
import { assetResourceLimits, type AssetFileDocument } from "@webstudio-is/sdk";
import type { AssetResourceContentReader } from "./hydration";
import {
  assetQueryPlanSelectsContent,
  executeAssetDetailQueryPlan,
  type AssetDetailQueryPlanV1,
} from "./query-plan";

const revision = `sha256:${"a".repeat(64)}`;
const queryHash = `sha256:${"b".repeat(64)}`;

const document = (overrides: Partial<AssetFileDocument> = {}) =>
  ({
    _id: "alpha",
    _type: "asset.file",
    name: "alpha.md",
    path: "posts/alpha.md",
    key: "alpha",
    extension: "md",
    mimeType: "text/markdown",
    size: 5,
    revision: "asset-alpha",
    contentRef: "content-alpha",
    properties: { title: "Alpha", author: { name: "Ada" } },
    ...overrides,
  }) satisfies AssetFileDocument;

const plan = (
  overrides: Partial<AssetDetailQueryPlanV1> = {}
): AssetDetailQueryPlanV1 => ({
  format: "webstudio-asset-query-plan",
  version: 1,
  kind: "asset-detail",
  queryHash,
  assetRevision: revision,
  rootResponseKey: "asset",
  lookup: {
    field: "path",
    value: { kind: "variable", name: "path" },
  },
  variables: [
    {
      name: "path",
      type: { kind: "named", name: "String", required: true },
    },
  ],
  fields: [
    { kind: "value", responseKey: "id", path: ["_id"] },
    {
      kind: "object",
      responseKey: "properties",
      path: ["properties"],
      fields: [
        { kind: "value", responseKey: "title", path: ["title"] },
        {
          kind: "object",
          responseKey: "author",
          path: ["author"],
          fields: [{ kind: "value", responseKey: "name", path: ["name"] }],
        },
      ],
    },
  ],
  ...overrides,
});

describe("asset query plan inspection", () => {
  test("only detects content projections", () => {
    expect(assetQueryPlanSelectsContent(plan())).toBe(false);
    expect(
      assetQueryPlanSelectsContent({
        ...plan(),
        lookup: { field: "path", value: { kind: "content" } },
      })
    ).toBe(false);
    expect(
      assetQueryPlanSelectsContent(
        plan({
          fields: [
            {
              kind: "object",
              responseKey: "nested",
              path: ["properties"],
              fields: [
                {
                  kind: "content",
                  responseKey: "body",
                  options: { mode: "full" },
                  fields: [],
                },
              ],
            },
          ],
        })
      )
    ).toBe(true);
  });
});

describe("asset detail query plans", () => {
  test("projects one asset with variables, aliases, and nested fields", async () => {
    const result = await executeAssetDetailQueryPlan({
      plan: plan({ rootResponseKey: "post" }),
      documents: [document()],
      assetRevision: revision,
      variables: { path: "posts/alpha.md" },
    });

    expect(result).toEqual({
      post: {
        id: "alpha",
        properties: { title: "Alpha", author: { name: "Ada" } },
      },
    });
  });

  test("returns null when the detail asset does not exist", async () => {
    await expect(
      executeAssetDetailQueryPlan({
        plan: plan(),
        documents: [document()],
        assetRevision: revision,
        variables: { path: "posts/missing.md" },
      })
    ).resolves.toEqual({ asset: null });
  });

  test("uses defaults and rejects undeclared, missing, or stale inputs", async () => {
    const defaultPlan = plan({
      lookup: { field: "_id", value: { kind: "variable", name: "id" } },
      variables: [
        {
          name: "id",
          type: { kind: "named", name: "ID", required: false },
          defaultValue: "alpha",
        },
      ],
    });
    await expect(
      executeAssetDetailQueryPlan({
        plan: defaultPlan,
        documents: [document()],
        assetRevision: revision,
      })
    ).resolves.toMatchObject({ asset: { id: "alpha" } });
    await expect(
      executeAssetDetailQueryPlan({
        plan: plan(),
        documents: [document()],
        assetRevision: revision,
      })
    ).rejects.toThrow("$path is required");
    await expect(
      executeAssetDetailQueryPlan({
        plan: plan(),
        documents: [document()],
        assetRevision: revision,
        variables: { path: "posts/alpha.md", extra: true },
      })
    ).rejects.toThrow("$extra is not declared");
    await expect(
      executeAssetDetailQueryPlan({
        plan: plan(),
        documents: [document()],
        assetRevision: `sha256:${"c".repeat(64)}`,
        variables: { path: "posts/alpha.md" },
      })
    ).rejects.toThrow("stale");
  });

  test("rejects ambiguous identities and malformed plans", async () => {
    await expect(
      executeAssetDetailQueryPlan({
        plan: plan(),
        documents: [document(), document({ _id: "duplicate" })],
        assetRevision: revision,
        variables: { path: "posts/alpha.md" },
      })
    ).rejects.toThrow("ambiguous");
    await expect(
      executeAssetDetailQueryPlan({
        plan: plan({
          fields: [
            { kind: "value", responseKey: "id", path: ["_id"] },
            { kind: "value", responseKey: "id", path: ["path"] },
          ],
        }),
        documents: [document()],
        assetRevision: revision,
        variables: { path: "posts/alpha.md" },
      })
    ).rejects.toThrow("projections are invalid");
  });

  test("safely preserves prototype-like aliases", async () => {
    const result = await executeAssetDetailQueryPlan({
      plan: plan({
        rootResponseKey: "__proto__",
        fields: [{ kind: "value", responseKey: "constructor", path: ["_id"] }],
      }),
      documents: [document()],
      assetRevision: revision,
      variables: { path: "posts/alpha.md" },
    });

    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(result.__proto__).toEqual({ constructor: "alpha" });
    expect(Object.getPrototypeOf(result)).toBeNull();
  });

  test("caches identical content reads and projects hydrated fields", async () => {
    const bytes = new TextEncoder().encode("hello");
    let readCount = 0;
    const read: AssetResourceContentReader = async () => {
      readCount += 1;
      return {
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
      };
    };
    const content = {
      kind: "content" as const,
      responseKey: "first",
      options: { mode: "FULL" },
      fields: [{ kind: "value" as const, responseKey: "text", path: ["text"] }],
    };
    const result = await executeAssetDetailQueryPlan({
      plan: plan({
        fields: [content, { ...content, responseKey: "second" }],
      }),
      documents: [document()],
      assetRevision: revision,
      variables: { path: "posts/alpha.md" },
      read,
    });

    expect(result).toEqual({
      asset: { first: { text: "hello" }, second: { text: "hello" } },
    });
    expect(readCount).toBe(1);
  });

  test("enforces aggregate content limits across different selections", async () => {
    const size = assetResourceLimits.hydratedFileBytes;
    const bytes = new Uint8Array(size);
    const read: AssetResourceContentReader = async (_contentRef, range) => ({
      data: {
        async *[Symbol.asyncIterator]() {
          yield range === undefined
            ? bytes
            : bytes.subarray(range.offset, range.offset + range.length);
        },
      },
    });
    const content = (responseKey: string, mode: "FULL" | "MARKDOWN_BODY") => ({
      kind: "content" as const,
      responseKey,
      options: { mode },
      fields: [{ kind: "value" as const, responseKey: "text", path: ["text"] }],
    });

    await expect(
      executeAssetDetailQueryPlan({
        plan: plan({
          fields: [
            content("full", "FULL"),
            content("body", "MARKDOWN_BODY"),
            {
              kind: "content",
              responseKey: "range",
              options: { mode: "RANGE", offset: 0, length: 1 },
              fields: [{ kind: "value", responseKey: "text", path: ["text"] }],
            },
          ],
        }),
        documents: [document({ size })],
        assetRevision: revision,
        variables: { path: "posts/alpha.md" },
        read,
      })
    ).rejects.toThrow("hydration limits");
  });
});
