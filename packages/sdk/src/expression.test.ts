import { expect, test } from "vitest";
import {
  decodeDataVariableId,
  encodeDataVariableId,
  executeExpression,
  SYSTEM_VARIABLE_ID,
} from "./expression";

test("encode and decode Webstudio data variable names", () => {
  expect(encodeDataVariableId("my--id")).toEqual(
    "$ws$dataSource$my__DASH____DASH__id"
  );
  expect(decodeDataVariableId(encodeDataVariableId("my--id"))).toEqual(
    "my--id"
  );
  expect(decodeDataVariableId("myVarName")).toBeUndefined();
  expect(encodeDataVariableId(SYSTEM_VARIABLE_ID)).toEqual("$ws$system");
  expect(
    decodeDataVariableId(encodeDataVariableId(SYSTEM_VARIABLE_ID))
  ).toEqual(SYSTEM_VARIABLE_ID);
});

test("read a static Webstudio expression without evaluating code", () => {
  expect(executeExpression(undefined)).toBeUndefined();
  expect(executeExpression("true")).toBe(true);
  expect(executeExpression("false")).toBe(false);
  expect(executeExpression("1 + 1")).toBeUndefined();
  expect(executeExpression("someVariable + 1")).toBeUndefined();
});
