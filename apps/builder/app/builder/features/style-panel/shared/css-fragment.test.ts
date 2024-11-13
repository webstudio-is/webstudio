import { expect, test } from "vitest";
import { parseCssFragment } from "./css-fragment";
import { parseCssValue } from "@webstudio-is/css-data";
import { setEnv } from "@webstudio-is/feature-flags";

setEnv("*");

test("parse var()", () => {
  const result = new Map([
    ["backgroundImage", parseCssValue("backgroundImage", "var(--bg)")],
  ]);
  expect(
    parseCssFragment("var(--bg)", ["backgroundImage", "background"])
  ).toEqual(result);
  expect(
    parseCssFragment("background-image: var(--bg)", [
      "backgroundImage",
      "background",
    ])
  ).toEqual(result);
});

test("fallback further to valid values", () => {
  const result = new Map([
    ["backgroundImage", parseCssValue("backgroundImage", "none")],
    ["backgroundPositionX", parseCssValue("backgroundPositionX", "0%")],
    ["backgroundPositionY", parseCssValue("backgroundPositionY", "0%")],
    ["backgroundSize", parseCssValue("backgroundSize", "auto auto")],
    ["backgroundRepeat", parseCssValue("backgroundRepeat", "repeat")],
    ["backgroundAttachment", parseCssValue("backgroundAttachment", "scroll")],
    ["backgroundOrigin", parseCssValue("backgroundOrigin", "padding-box")],
    ["backgroundClip", parseCssValue("backgroundClip", "border-box")],
    [
      "backgroundColor",
      parseCssValue("backgroundColor", "rgba(255, 255, 255, 1)"),
    ],
  ]);
  expect(parseCssFragment("#fff", ["backgroundImage", "background"])).toEqual(
    result
  );
});

test("parse shorthand property", () => {
  const result = new Map([
    ["transitionProperty", parseCssValue("transitionProperty", "opacity")],
    ["transitionDuration", parseCssValue("transitionDuration", "1s")],
    [
      "transitionTimingFunction",
      parseCssValue("transitionTimingFunction", "ease"),
    ],
    ["transitionDelay", parseCssValue("transitionDelay", "0s")],
    ["transitionBehavior", parseCssValue("transitionBehavior", "normal")],
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
      ["transitionProperty", parseCssValue("transitionProperty", "opacity")],
      ["transitionDuration", parseCssValue("transitionDuration", "1s")],
    ])
  );
});
