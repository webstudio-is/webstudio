import { describe, expect, test } from "vitest";
import { mergeFontMeta } from "./schema";

describe("mergeFontMeta", () => {
  test("keeps the detected font shape", () => {
    const variationAxes = {
      wght: { name: "Weight", min: 100, default: 400, max: 900 },
    };
    expect(
      mergeFontMeta(
        { family: "Detected Family", variationAxes },
        { family: "Configured Family", style: "normal", weight: 400 }
      )
    ).toEqual({ family: "Configured Family", variationAxes });
    expect(
      mergeFontMeta(
        { family: "Detected Family", style: "normal", weight: 400 },
        { family: "Configured Family", variationAxes }
      )
    ).toEqual({
      family: "Configured Family",
      style: "normal",
      weight: 400,
    });
  });

  test("rejects invalid metadata before selecting compatible fields", () => {
    expect(
      mergeFontMeta(
        {
          family: "Detected Family",
          variationAxes: {
            wght: { name: "Weight", min: 100, default: 400, max: 900 },
          },
        },
        { style: "unsupported" }
      )
    ).toBeUndefined();
  });
});
