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

test("execute a static Webstudio expression", () => {
  expect(executeExpression(undefined)).toBeUndefined();
  expect(executeExpression("1 + 1")).toEqual(2);
  expect(executeExpression("someVariable + 1")).toBeUndefined();
});
