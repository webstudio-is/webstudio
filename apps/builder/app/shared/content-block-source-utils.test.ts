import { describe, expect, test } from "vitest";
import { ROOT_INSTANCE_ID, type Instances } from "@webstudio-is/sdk";
import {
  getContentBlockOccurrenceVariableValues,
  isRepeatedContentBlockOccurrence,
  parseContentBlockRenderScope,
  resolveContentBlockOccurrenceAssetId,
} from "./content-block-source-utils";

const selector = ["block", "collection[item]", "collection", "body"];

describe("Content Block occurrence source", () => {
  test("parses only instance selectors", () => {
    expect(parseContentBlockRenderScope(JSON.stringify(selector))).toEqual(
      selector
    );
    expect(parseContentBlockRenderScope("{}")).toBeUndefined();
    expect(parseContentBlockRenderScope('["block",1]')).toBeUndefined();
  });

  test("resolves the same direct and root-qualified variable scopes", () => {
    const values = new Map([["asset", "article"]]);
    const direct = new Map([[JSON.stringify(selector), values]]);
    const rootQualified = new Map([
      [JSON.stringify([...selector, ROOT_INSTANCE_ID]), values],
    ]);
    expect(
      getContentBlockOccurrenceVariableValues({
        instanceSelector: selector,
        variableValuesByRenderScope: direct,
      })
    ).toBe(values);
    expect(
      resolveContentBlockOccurrenceAssetId({
        source: { type: "expression", value: "asset" },
        instanceSelector: selector,
        variableValuesByRenderScope: rootQualified,
      })
    ).toBe("article");
  });

  test("resolves each bound Collection occurrence independently", () => {
    const first = ["block", "collection[first]", "collection", "body"];
    const second = ["block", "collection[second]", "collection", "body"];
    const values = new Map([
      [JSON.stringify(first), new Map([["asset", "a.mdx"]])],
      [JSON.stringify(second), new Map([["asset", "b.mdx"]])],
    ]);

    expect(
      [first, second].map((instanceSelector) =>
        resolveContentBlockOccurrenceAssetId({
          source: { type: "expression", value: "asset" },
          instanceSelector,
          variableValuesByRenderScope: values,
        })
      )
    ).toEqual(["a.mdx", "b.mdx"]);
  });

  test("detects repeated selectors consistently", () => {
    const instances = new Map(
      ["block", "collection", "body"].map((id) => [
        id,
        {
          type: "instance" as const,
          id,
          component: "Box",
          children: [],
        },
      ])
    ) as Instances;
    expect(
      isRepeatedContentBlockOccurrence({
        instanceSelector: selector,
        instances,
      })
    ).toBe(true);
    expect(
      isRepeatedContentBlockOccurrence({
        instanceSelector: ["block", "collection", "body"],
        instances,
      })
    ).toBe(false);
  });
});
