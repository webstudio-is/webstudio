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
    ).toThrow("unsupported fields");
  });
});
