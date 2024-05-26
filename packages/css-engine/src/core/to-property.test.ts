import { describe, test, expect } from "@jest/globals";
import { hyphenateProperty, toProperty } from "./to-property";

describe("hyphenateProperty", () => {
  test("hyphenates regular css", () => {
    expect(hyphenateProperty("backgroundColor")).toEqual("background-color");
    expect(hyphenateProperty("fontSize")).toEqual("font-size");
    expect(hyphenateProperty("color")).toEqual("color");
    expect(hyphenateProperty("borderTopLeftRadius")).toEqual(
      "border-top-left-radius"
    );
  });

  test("hyphenates vendor prefixes correctly", () => {
    expect(hyphenateProperty("MozTransition")).toEqual("-moz-transition");
    expect(hyphenateProperty("WebkitTransition")).toEqual("-webkit-transition");
  });
});

describe("toProperty", () => {
  test("boxSizing", () => {
    expect(toProperty("boxSizing")).toBe("box-sizing");
  });
  test("backgroundClip", () => {
    expect(toProperty("backgroundClip")).toBe("-webkit-background-clip");
  });
});
