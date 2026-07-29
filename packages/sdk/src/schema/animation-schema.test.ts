import { expect, test } from "vitest";
import { parseCssValue } from "@webstudio-is/css-data";
import { createAnimationActionInput } from "./animation-schema";

test("normalizes authored animation actions", () => {
  const animationActionInput = createAnimationActionInput({ parseCssValue });

  expect(
    animationActionInput.parse({
      type: "scroll",
      animations: [
        {
          keyframes: [
            {
              styles: {
                transform: "translateX(-75%)",
              },
            },
          ],
        },
      ],
    })
  ).toEqual({
    type: "scroll",
    animations: [
      {
        timing: {},
        keyframes: [
          {
            styles: {
              transform: parseCssValue("transform", "translateX(-75%)"),
            },
          },
        ],
      },
    ],
  });
});
