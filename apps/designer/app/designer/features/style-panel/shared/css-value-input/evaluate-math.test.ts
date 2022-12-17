import { describe, test, expect } from "@jest/globals";
import { evaluateMath } from "./evaluate-math";

describe("Evaluate math", () => {
  test("should evaluate simple math", () => {
    expect(evaluateMath("1 + 1")).toEqual(2);
    expect(evaluateMath("4 + 2 * 3")).toEqual(10);
    expect(evaluateMath("4 / 2 * 3 - 1")).toEqual(5);
  });

  test("should evaluate simple floating math", () => {
    expect(evaluateMath("1.0 + 1.1")).toEqual(2.1);
    expect(evaluateMath("4 + 2.5 * 3.4")).toEqual(12.5);
    expect(evaluateMath("4.5 / 2 * 3.3 - 1")).toEqual(6.425);
  });

  test("return undefined if math is wrong", () => {
    expect(evaluateMath("1 ++ 1")).toEqual(undefined);
    expect(evaluateMath("++1")).toEqual(undefined);
    expect(evaluateMath("1 * 2 *")).toEqual(undefined);
  });

  test("return undefined if any symbols excepts numbers or spaces in input", () => {
    expect(evaluateMath("1 + 1 p")).toEqual(undefined);
    expect(evaluateMath("e")).toEqual(undefined);
    expect(evaluateMath("{1+2}")).toEqual(undefined);
    expect(evaluateMath("alert('hello')")).toEqual(undefined);
  });
});
