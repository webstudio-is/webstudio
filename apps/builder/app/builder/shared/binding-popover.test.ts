import { expect, test } from "@jest/globals";
import { evaluateExpressionWithinScope } from "./binding-popover";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";

test("evaluateExpressionWithinScope works", () => {
  const variableName = "jsonVariable";
  const encVariableName = encodeDataSourceVariable(variableName);
  const variableValue = 1;
  const variables = { [encVariableName]: variableValue };
  const expression = `${encVariableName} + ${encVariableName}`;

  expect(evaluateExpressionWithinScope(expression, variables)).toEqual(2);
});
