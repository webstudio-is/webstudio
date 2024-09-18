import { describe, test, expect } from "@jest/globals";
import type { FontAsset } from "@webstudio-is/sdk";
import { isExternalFontWeightSupported } from "./font-weight-support";

const createServerAsset = (meta: FontAsset["meta"]): FontAsset => ({
  id: "111",
  type: "font",
  name: "test",
  projectId: "id",
  size: 2135,
  format: "ttf",
  createdAt: "",
  description: "",
  meta,
});

describe("isExternalFontWeightSupported", () => {
  test("static", () => {
    const meta = {
      family: "Acumin Pro",
      style: "italic",
      weight: 900,
    } as const;
    const asset = createServerAsset(meta);
    expect(isExternalFontWeightSupported(asset, "400", "Roboto")).toBe(false);
    expect(isExternalFontWeightSupported(asset, "400", "Acumin Pro")).toBe(
      false
    );
    expect(isExternalFontWeightSupported(asset, "900", "Roboto")).toBe(false);
    expect(isExternalFontWeightSupported(asset, "900", "Acumin Pro")).toBe(
      true
    );
  });

  test("variable", () => {
    const meta = {
      family: "Roboto Flex",
      variationAxes: {
        wght: { name: "wght", min: 100, default: 400, max: 1000 },
      },
    } as const;
    const asset = createServerAsset(meta);
    expect(isExternalFontWeightSupported(asset, "1", meta.family)).toBe(false);
    expect(isExternalFontWeightSupported(asset, "100", meta.family)).toBe(true);
    expect(isExternalFontWeightSupported(asset, "500", meta.family)).toBe(true);
    expect(isExternalFontWeightSupported(asset, "1000", meta.family)).toBe(
      true
    );
    expect(isExternalFontWeightSupported(asset, "1001", meta.family)).toBe(
      false
    );
  });
});
