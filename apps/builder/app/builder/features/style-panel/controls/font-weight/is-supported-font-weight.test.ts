import { describe, test } from "@jest/globals";
import type { FontAsset } from "@webstudio-is/asset-uploader";
import { isSupportedFontWeight } from "./is-supported-font-weight";

const createServerAsset = (meta: FontAsset["meta"]): FontAsset => ({
  id: "111",
  type: "font",
  name: "test",
  location: "FS",
  projectId: "id",
  size: 2135,
  format: "ttf",
  createdAt: "",
  description: "",
  meta,
  path: "",
});

describe("isSupportedFontWeight", () => {
  test("static", () => {
    const meta = {
      family: "Acumin Pro",
      style: "italic",
      weight: 900,
    } as const;
    const asset = createServerAsset(meta);
    expect(isSupportedFontWeight(asset, "400", "Roboto")).toBe(false);
    expect(isSupportedFontWeight(asset, "400", "Acumin Pro")).toBe(false);
    expect(isSupportedFontWeight(asset, "900", "Roboto")).toBe(false);
    expect(isSupportedFontWeight(asset, "900", "Acumin Pro")).toBe(true);
  });

  test("variable", () => {
    const meta = {
      family: "Roboto Flex",
      variationAxes: {
        wght: { name: "wght", min: 100, default: 400, max: 1000 },
      },
    } as const;
    const asset = createServerAsset(meta);
    expect(isSupportedFontWeight(asset, "1", meta.family)).toBe(false);
    expect(isSupportedFontWeight(asset, "100", meta.family)).toBe(true);
    expect(isSupportedFontWeight(asset, "500", meta.family)).toBe(true);
    expect(isSupportedFontWeight(asset, "1000", meta.family)).toBe(true);
    expect(isSupportedFontWeight(asset, "1001", meta.family)).toBe(false);
  });
});
