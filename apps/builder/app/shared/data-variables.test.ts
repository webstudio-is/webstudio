import { expect, test, vi } from "vitest";
import {
  computeExpression,
  decodeDataVariableName,
  encodeDataVariableName,
  restoreExpressionVariables,
  unsetExpressionVariables,
} from "./data-variables";

test("encode data variable name when necessary", () => {
  expect(encodeDataVariableName("formState")).toEqual("formState");
  expect(encodeDataVariableName("Collection Item")).toEqual(
    "Collection$32$Item"
  );
  expect(encodeDataVariableName("$my$Variable")).toEqual("$36$my$36$Variable");
});

test("dencode data variable name", () => {
  expect(decodeDataVariableName(encodeDataVariableName("formState"))).toEqual(
    "formState"
  );
  expect(
    decodeDataVariableName(encodeDataVariableName("Collection Item"))
  ).toEqual("Collection Item");
});

test("dencode data variable name with dollar sign", () => {
  expect(
    decodeDataVariableName(encodeDataVariableName("$my$Variable"))
  ).toEqual("$my$Variable");
  expect(decodeDataVariableName("$my$Variable")).toEqual("$my$Variable");
});

test("unset expression variables", () => {
  expect(
    unsetExpressionVariables({
      expression: `$ws$dataSource$myId + arbitaryVariable`,
      unsetNameById: new Map([["myId", "My Variable"]]),
    })
  ).toEqual("My$32$Variable + arbitaryVariable");
});

test("ignore not existing variables in expressions", () => {
  expect(
    unsetExpressionVariables({
      expression: `$ws$dataSource$myId + arbitaryVariable`,
      unsetNameById: new Map(),
    })
  ).toEqual("$ws$dataSource$myId + arbitaryVariable");
});

test("restore expression variables", () => {
  expect(
    restoreExpressionVariables({
      expression: `My$32$Variable + missingVariable`,
      maskedIdByName: new Map([["My Variable", "myId"]]),
    })
  ).toEqual("$ws$dataSource$myId + missingVariable");
});

test("compute expression with decoded ids", () => {
  expect(
    computeExpression("$ws$dataSource$myId", new Map([["myId", "value"]]))
  ).toEqual("value");
});

test("compute expression with decoded names", () => {
  expect(
    computeExpression("My$32$Name", new Map([["My Name", "value"]]))
  ).toEqual("value");
});

test("compute expression when invalid syntax", () => {
  // prevent error message in test report
  const spy = vi.spyOn(console, "error");
  spy.mockImplementationOnce(() => {});
  expect(computeExpression("https://github.com", new Map())).toEqual(undefined);
  expect(spy).toHaveBeenCalledOnce();
  spy.mockRestore();
});

test("compute expression with nested field of undefined without error", () => {
  const spy = vi.spyOn(console, "error");
  const variables = new Map([["myVariable", undefined]]);
  expect(computeExpression("myVariable.field", variables)).toEqual(undefined);
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});

test("compute literal expression when variable is json object", () => {
  const jsonObject = { hello: "world", subObject: { world: "hello" } };
  const variables = new Map([["jsonVariable", jsonObject]]);
  expect(computeExpression("`${jsonVariable}`", variables)).toEqual(
    `{"hello":"world","subObject":{"world":"hello"}}`
  );
  expect(computeExpression("`${jsonVariable.subObject}`", variables)).toEqual(
    `{"world":"hello"}`
  );
});

test("compute literal expression when object is frozen", () => {
  const jsonObject = Object.freeze({
    hello: "world",
    subObject: { world: "hello" },
  });
  const variables = new Map([["jsonVariable", jsonObject]]);
  expect(computeExpression("`${jsonVariable.subObject}`", variables)).toEqual(
    `{"world":"hello"}`
  );
});

test("compute unset variables as undefined", () => {
  expect(computeExpression(`a`, new Map())).toEqual(undefined);
  expect(computeExpression("`${a}`", new Map())).toEqual("undefined");
});
