import { expect, test } from "vitest";
import { evaluateExpressionWithinScope } from "./binding-popover";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";

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
