import { expect, test } from "@jest/globals";
import { createScope } from "./scope";

test("use variable name for specific id and suffix on collision", () => {
  const scope = createScope();
  expect(scope.getName("1", "myName")).toEqual("myName");
  expect(scope.getName("2", "myName")).toEqual("myName_1");
  // reuse already cached one
  expect(scope.getName("1", "myName")).toEqual("myName");
});

test("allow to predefine already occupied identifiers", () => {
  const scope = createScope(["myName", "anotherName"]);
  expect(scope.getName("1", "myName")).toEqual("myName_1");
  expect(scope.getName("2", "anotherName")).toEqual("anotherName_1");
  expect(scope.getName("3", "newName")).toEqual("newName");
});
