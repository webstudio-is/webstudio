import { expect, test } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import {
  evaluateExpressionWithinScope,
  isBindingRemovalDisabled,
} from "./binding-popover";

test("evaluateExpressionWithinScope works", () => {
  const variableName = "jsonVariable";
  const encVariableName = encodeDataSourceVariable(variableName);
  const variableValue = 1;

  expect(
    evaluateExpressionWithinScope(`${encVariableName} + ${encVariableName}`, {
      [encVariableName]: variableValue,
    })
  ).toEqual(2);
});

test("evaluateExpressionWithinScope treats empty expression as undefined", () => {
  expect(evaluateExpressionWithinScope("", {})).toBeUndefined();
  expect(evaluateExpressionWithinScope("  ", {})).toBeUndefined();
});

test("disables binding removal when the consumer cannot preserve its content", () => {
  expect(
    isBindingRemovalDisabled({
      variant: "bound",
      allowBindingRemoval: false,
    })
  ).toBe(true);
  expect(
    isBindingRemovalDisabled({
      variant: "bound",
      allowBindingRemoval: true,
    })
  ).toBe(false);
});
