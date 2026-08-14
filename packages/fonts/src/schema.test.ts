import { describe, expect, test } from "vitest";
import { fontMeta, fontMetaUpdate, mergeFontMeta } from "./schema";

test("accepts custom variation axes", () => {
  const meta = {
    family: "Antarctica",
    variationAxes: {
      wght: { name: "Weight", min: 100, default: 400, max: 950 },
      CNTR: { name: "Contrast", min: 0, default: 0, max: 100 },
    },
  };

  expect(fontMeta.parse(meta)).toEqual({ ...meta, style: "normal" });
});

describe("mergeFontMeta", () => {
  test("defaults legacy variable fonts to normal style", () => {
    expect(fontMeta.parse({ family: "Inter", variationAxes: {} })).toEqual({
      family: "Inter",
      style: "normal",
      variationAxes: {},
    });
  });

  test("round-trips and updates variable font metadata", () => {
    const variationAxes = {
      wght: { name: "Weight", min: 100, default: 400, max: 900 },
    };
    const meta = { family: "Inter", style: "italic" as const, variationAxes };
    expect(fontMetaUpdate.parse(meta)).toEqual(meta);
    expect(
      mergeFontMeta(
        { family: "Inter", style: "normal", variationAxes },
        { style: "italic" }
      )
    ).toEqual(meta);
    expect(mergeFontMeta(meta, { variationAxes })).toEqual(meta);
  });

  test("keeps the detected font shape", () => {
    const variationAxes = {
      wght: { name: "Weight", min: 100, default: 400, max: 900 },
    };
    expect(
      mergeFontMeta(
        { family: "Detected Family", style: "normal", variationAxes },
        { family: "Configured Family", style: "normal", weight: 400 }
      )
    ).toEqual({
      family: "Configured Family",
      style: "normal",
      variationAxes,
    });
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
          style: "normal",
          variationAxes: {
            wght: { name: "Weight", min: 100, default: 400, max: 900 },
          },
        },
        { style: "unsupported" }
      )
    ).toBeUndefined();
  });
});
