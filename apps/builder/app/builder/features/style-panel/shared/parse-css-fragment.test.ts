import { expect, test } from "@jest/globals";
import { parseCssFragment } from "./parse-css-fragment";

test("parse shorthand property", () => {
  const result = new Map([
    [
      "transitionProperty",
      {
        type: "layers",
        value: [{ type: "unparsed", value: "opacity" }],
      },
    ],
    [
      "transitionDuration",
      {
        type: "layers",
        value: [{ type: "unit", unit: "s", value: 1 }],
      },
    ],
    [
      "transitionTimingFunction",
      {
        type: "layers",
        value: [{ type: "keyword", value: "ease" }],
      },
    ],
    [
      "transitionDelay",
      {
        type: "layers",
        value: [{ type: "unit", unit: "s", value: 0 }],
      },
    ],
    [
      "transitionBehavior",
      {
        type: "layers",
        value: [{ type: "keyword", value: "normal" }],
      },
    ],
  ]);
  expect(parseCssFragment("opacity 1s", "transition")).toEqual(result);
  expect(parseCssFragment("transition: opacity 1s", "transition")).toEqual(
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
      "transition"
    )
  ).toEqual(
    new Map([
      [
        "transitionProperty",
        {
          type: "layers",
          value: [{ type: "unparsed", value: "opacity" }],
        },
      ],
      [
        "transitionDuration",
        {
          type: "layers",
          value: [{ type: "unit", unit: "s", value: 1 }],
        },
      ],
    ])
  );
});
