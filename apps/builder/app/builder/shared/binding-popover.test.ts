import { expect, test } from "vitest";
import { encodeDataSourceVariable } from "@webstudio-is/sdk";
import { evaluateExpressionWithinScope } from "./binding-popover";

test("evaluateExpressionWithinScope works", async () => {
  const variableName = "jsonVariable";
  const encVariableName = encodeDataSourceVariable(variableName);
  const variableValue = 1;

  await expect(
    evaluateExpressionWithinScope(`${encVariableName} + ${encVariableName}`, {
      [encVariableName]: variableValue,
    })
  ).resolves.toEqual(2);
});

test("evaluateExpressionWithinScope treats empty expression as undefined", async () => {
  await expect(evaluateExpressionWithinScope("", {})).resolves.toBeUndefined();
  await expect(
    evaluateExpressionWithinScope("  ", {})
  ).resolves.toBeUndefined();
});
