import { expect, test } from "vitest";
import { parseCssFragment } from "./css-fragment";
import { parseCssValue } from "@webstudio-is/css-data";
import { setEnv } from "@webstudio-is/feature-flags";

setEnv("*");

test("parse var()", () => {
  const result = new Map([
    ["background-image", parseCssValue("backgroundImage", "var(--bg)")],
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
    ["background-image", parseCssValue("backgroundImage", "none")],
    ["background-position-x", parseCssValue("backgroundPositionX", "0%")],
    ["background-position-y", parseCssValue("backgroundPositionY", "0%")],
    ["background-size", parseCssValue("backgroundSize", "auto auto")],
    ["background-repeat", parseCssValue("backgroundRepeat", "repeat")],
    ["background-attachment", parseCssValue("backgroundAttachment", "scroll")],
    ["background-origin", parseCssValue("backgroundOrigin", "padding-box")],
    ["background-clip", parseCssValue("backgroundClip", "border-box")],
    [
      "background-color",
      parseCssValue("backgroundColor", "rgba(255, 255, 255, 1)"),
    ],
  ]);
  expect(parseCssFragment("#fff", ["background-image", "background"])).toEqual(
    result
  );
});

test("parse shorthand property", () => {
  const result = new Map([
    ["transition-property", parseCssValue("transitionProperty", "opacity")],
    ["transition-duration", parseCssValue("transitionDuration", "1s")],
    [
      "transition-timing-function",
      parseCssValue("transitionTimingFunction", "ease"),
    ],
    ["transition-delay", parseCssValue("transitionDelay", "0s")],
    ["transition-behavior", parseCssValue("transitionBehavior", "normal")],
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
      ["transition-property", parseCssValue("transitionProperty", "opacity")],
      ["transition-duration", parseCssValue("transitionDuration", "1s")],
    ])
  );
});
