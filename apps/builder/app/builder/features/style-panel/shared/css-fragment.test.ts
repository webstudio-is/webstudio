import { expect, test } from "vitest";
import { parseCssFragment } from "./css-fragment";
import { parseCssValue } from "@webstudio-is/css-data";
import { setEnv } from "@webstudio-is/feature-flags";

setEnv("*");

test("parse var()", () => {
  const result = new Map([
    ["background-image", parseCssValue("background-image", "var(--bg)")],
  ]);
  expect(
    parseCssFragment("var(--bg)", ["background-image", "background"])
  ).toEqual(result);
  expect(
    parseCssFragment("background-image: var(--bg)", [
      "background-image",
      "background",
    ])
  ).toEqual(result);
});

test("fallback further to valid values", () => {
  const result = new Map([
    ["background-image", parseCssValue("background-image", "none")],
    ["background-position-x", parseCssValue("background-position-x", "0%")],
    ["background-position-y", parseCssValue("background-position-y", "0%")],
    ["background-size", parseCssValue("background-size", "auto auto")],
    ["background-repeat", parseCssValue("background-repeat", "repeat")],
    ["background-attachment", parseCssValue("background-attachment", "scroll")],
    ["background-origin", parseCssValue("background-origin", "padding-box")],
    ["background-clip", parseCssValue("background-clip", "border-box")],
    [
      "background-color",
      parseCssValue("background-color", "rgba(255, 255, 255, 1)"),
    ],
  ]);
  expect(parseCssFragment("#fff", ["background-image", "background"])).toEqual(
    result
  );
});

test("parse shorthand property", () => {
  const result = new Map([
    ["transition-property", parseCssValue("transition-property", "opacity")],
    ["transition-duration", parseCssValue("transition-duration", "1s")],
    [
      "transition-timing-function",
      parseCssValue("transition-timing-function", "ease"),
    ],
    ["transition-delay", parseCssValue("transition-delay", "0s")],
    ["transition-behavior", parseCssValue("transition-behavior", "normal")],
  ]);
  expect(parseCssFragment("opacity 1s", ["transition"])).toEqual(result);
  expect(parseCssFragment("transition: opacity 1s", ["transition"])).toEqual(
    result
  );
});

test("parse longhand properties", () => {
  expect(
    parseCssFragment(
      `
       transition-property: opacity;
       transition-duration: 1s;
     `,
      ["transition"]
    )
  ).toEqual(
    new Map([
      ["transition-property", parseCssValue("transition-property", "opacity")],
      ["transition-duration", parseCssValue("transition-duration", "1s")],
    ])
  );
});
