import { expect, test } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { evaluateExpressionWithinScope } from "./binding-popover";

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
