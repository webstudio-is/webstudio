import { describe, test, expect } from "@jest/globals";
import { toKebabCase } from "./keyword-utils";

describe("toKebabCase", () => {
  test("PascalCase", () => {
    expect(toKebabCase("PascalCase")).toEqual("pascal-case");
  });

  test("Pascal Case", () => {
    expect(toKebabCase("Pascal Case")).toEqual("pascal-case");
    expect(toKebabCase("Pascal  Case")).toEqual("pascal-case");
  });

  test("Pascal Case", () => {
    expect(toKebabCase("Pascal Case")).toEqual("pascal-case");
    expect(toKebabCase("Pascal  Case")).toEqual("pascal-case");
  });

  test("camelCase", () => {
    expect(toKebabCase("camelCase")).toEqual("camel-case");
  });

  test("camel Case", () => {
    expect(toKebabCase("camel Case")).toEqual("camel-case");
  });

  test("kebab-case", () => {
    expect(toKebabCase("kebab-case")).toEqual("kebab-case");
  });

  test("not touches numerics", () => {
    expect(toKebabCase("02020px")).toEqual("02020px");
  });
});
