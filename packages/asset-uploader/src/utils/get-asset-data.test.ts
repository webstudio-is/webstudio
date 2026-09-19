import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { applyAssetDataOverride, getAssetData } from "./get-asset-data";

const require = createRequire(import.meta.url);

describe("asset data overrides", () => {
  test("parses font extensions as fonts even when declared as generic files", async () => {
    const data = readFileSync(
      require.resolve("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")
    );

    const detected = await getAssetData({
      type: "file",
      name: "inter-latin-wght-normal.woff2",
      size: data.byteLength,
      data,
    });

    expect(applyAssetDataOverride(detected)).toMatchObject({
      format: "woff2",
      meta: {
        family: "Inter",
        style: "normal",
        variationAxes: {
          wght: { min: 100, default: 400, max: 900 },
        },
      },
    });
  });

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
          meta: {
            family: "Detected Family",
            style: "italic",
            variationAxes,
          },
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
      meta: {
        family: "Configured Family",
        style: "normal",
        variationAxes,
      },
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

  test("rejects overriding a generic file format to a font format", () => {
    expect(() =>
      applyAssetDataOverride(
        { size: 100, format: "txt", meta: {} },
        { format: "woff2" }
      )
    ).toThrow("Font format requires valid font metadata");
  });
});
