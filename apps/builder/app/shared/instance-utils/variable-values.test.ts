import { expect, test } from "vitest";
import { ROOT_INSTANCE_ID } from "@webstudio-is/sdk";
import { getInstanceVariableValues } from "./variable-values";

test("merges fallback values with a root-qualified canvas scope", () => {
  const directValues = new Map([["direct", "value"]]);
  expect(
    getInstanceVariableValues(
      new Map([[JSON.stringify(["box", "body"]), directValues]]),
      ["box", "body"]
    )
  ).toBe(directValues);

  const valuesByInstanceSelector = new Map([
    [
      JSON.stringify(["box", "body", ROOT_INSTANCE_ID]),
      new Map([
        ["overridden", "scoped"],
        ["scoped", "value"],
      ]),
    ],
  ]);

  expect(
    getInstanceVariableValues(
      valuesByInstanceSelector,
      ["box", "body"],
      new Map([
        ["unscoped", "value"],
        ["overridden", "unscoped"],
      ])
    )
  ).toEqual(
    new Map([
      ["unscoped", "value"],
      ["overridden", "scoped"],
      ["scoped", "value"],
    ])
  );
});
