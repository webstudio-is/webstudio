import { expect, test } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import {
  evaluateExpressionWithinScope,
  validateExpressionScope,
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

test("validateExpressionScope reports unavailable variables", () => {
  const availableVariable = encodeDataSourceVariable("available");
  const missingVariable = encodeDataSourceVariable("missing");

  expect(
    validateExpressionScope(
      `${availableVariable} + ${missingVariable}`,
      new Map([[availableVariable, "available"]])
    )
  ).toEqual(`"${missingVariable}" is not defined in the scope`);
});
