import { describe, test } from "@jest/globals";
import { toProperty } from "./to-property";

describe("toProperty", () => {
  test("boxSizing", () => {
    expect(toProperty("boxSizing")).toBe("box-sizing");
  });
  test("backgroundClip", () => {
    expect(toProperty("backgroundClip")).toBe("-webkit-background-clip");
  });
});
