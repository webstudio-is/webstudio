import { describe, expect, test } from "vitest";
import { queryCapabilities } from "@webstudio-is/query-builder";
import { createAssetQueryCapabilities } from "./asset-query-capabilities";

describe("asset query capabilities", () => {
  test("describes standard fields, operators, features, and limits", () => {
    const capabilities = createAssetQueryCapabilities({});

    expect(queryCapabilities.safeParse(capabilities).success).toBe(true);
    expect(capabilities.fields).toContainEqual({
      path: ["size"],
      label: "Size",
      types: ["number"],
    });
    expect(capabilities.fields).toContainEqual({
      path: ["createdAt"],
      label: "Created at",
      types: ["string"],
    });
    expect(
      capabilities.operators.find(({ value }) => value === "contains")?.types
    ).toEqual(expect.arrayContaining(["string", "array"]));
    expect(capabilities.features.combinators).toEqual(["all", "any"]);
  });

  test("adds observed fields and retains configured fields missing from the catalog", () => {
    const capabilities = createAssetQueryCapabilities({
      catalog: {
        format: "webstudio-builder-asset-field-catalog",
        version: 1,
        canonicalRevision: `sha256:${"a".repeat(64)}`,
        documentCount: 1,
        fields: {
          title: {
            queryPath: ["properties", "title"],
            types: ["string"],
            occurrences: 1,
          },
        },
      },
      configuredPaths: [["properties", "removedField"]],
    });

    expect(capabilities.fields).toContainEqual({
      path: ["properties", "title"],
      label: "properties / title",
      types: ["string"],
    });
    expect(capabilities.fields).toContainEqual(
      expect.objectContaining({
        path: ["properties", "removedField"],
        types: expect.arrayContaining(["string", "object", "array"]),
      })
    );
  });
});
