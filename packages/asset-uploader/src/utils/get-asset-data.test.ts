import { describe, expect, test } from "vitest";
import { applyAssetDataOverride } from "./get-asset-data";

describe("asset data overrides", () => {
  test("merges partial font metadata over detected metadata", () => {
    expect(
      applyAssetDataOverride(
        {
          size: 100,
          format: "ttf",
          meta: { family: "Poppins", style: "normal", weight: 700 },
        },
        { meta: { weight: 800 } }
      )
    ).toEqual({
      size: 100,
      format: "ttf",
      meta: { family: "Poppins", style: "normal", weight: 800 },
    });
  });

  test("rejects overrides that make metadata invalid", () => {
    expect(() =>
      applyAssetDataOverride(
        {
          size: 100,
          format: "ttf",
          meta: { family: "Poppins", style: "normal", weight: 700 },
        },
        { meta: { weight: "heavy" } }
      )
    ).toThrow();
  });

  test("keeps the detected format for fonts", () => {
    expect(
      applyAssetDataOverride(
        {
          size: 100,
          format: "ttf",
          meta: { family: "Rajdhani", style: "normal", weight: 600 },
        },
        { format: "woff2" }
      )
    ).toEqual({
      size: 100,
      format: "ttf",
      meta: { family: "Rajdhani", style: "normal", weight: 600 },
    });
  });

  test("keeps variable axes when upload metadata describes a static font", () => {
    const variationAxes = {
      wght: { name: "Weight", min: 100, default: 400, max: 900 },
    };
    expect(
      applyAssetDataOverride(
        {
          size: 100,
          format: "woff2",
          meta: { family: "Detected Family", variationAxes },
        },
        {
          format: "woff2",
          meta: {
            family: "Configured Family",
            style: "normal",
            weight: 400,
          },
        }
      )
    ).toEqual({
      size: 100,
      format: "woff2",
      meta: { family: "Configured Family", variationAxes },
    });
  });

  test("rejects unsupported metadata overrides", () => {
    expect(() =>
      applyAssetDataOverride(
        {
          size: 100,
          format: "ttf",
          meta: { family: "Poppins", style: "normal", weight: 700 },
        },
        { meta: { familyName: "Poppins" } }
      )
    ).toThrow("metadata override is invalid");
  });
});
