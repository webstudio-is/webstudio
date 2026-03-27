import { describe, test, expect } from "vitest";
import { sRGB } from "colorjs.io/fn";
import {
  color,
  toColorSpace,
  toColorComponent,
  srgbColor,
  transparentColor,
  whiteColor,
  parseColor,
  colorDistance,
  lerpColor,
  serializeColor,
} from "./color";

describe("toColorComponent", () => {
  test("rounds to 4 decimal places", () => {
    expect(toColorComponent(0.123456789)).toBe(0.1235);
  });
  test("treats null/undefined as 0", () => {
    expect(toColorComponent(null)).toBe(0);
    expect(toColorComponent(undefined)).toBe(0);
  });
  test("preserves exact values", () => {
    expect(toColorComponent(1)).toBe(1);
    expect(toColorComponent(0)).toBe(0);
  });
});

describe("toColorSpace", () => {
  test("maps all registered spaces", () => {
    expect(toColorSpace(color.sRGB)).toBe("srgb");
    expect(toColorSpace(color.sRGB_Linear)).toBe("srgb-linear");
    expect(toColorSpace(color.HSL)).toBe("hsl");
    expect(toColorSpace(color.HWB)).toBe("hwb");
    expect(toColorSpace(color.Lab)).toBe("lab");
    expect(toColorSpace(color.LCH)).toBe("lch");
    expect(toColorSpace(color.OKLab)).toBe("oklab");
    expect(toColorSpace(color.OKLCH)).toBe("oklch");
    expect(toColorSpace(color.P3)).toBe("p3");
    expect(toColorSpace(color.A98RGB)).toBe("a98rgb");
    expect(toColorSpace(color.ProPhoto)).toBe("prophoto");
    expect(toColorSpace(color.REC_2020)).toBe("rec2020");
    expect(toColorSpace(color.XYZ_D65)).toBe("xyz-d65");
    expect(toColorSpace(color.XYZ_D50)).toBe("xyz-d50");
  });
  test("resolves CSS aliases via ColorSpace.get()", () => {
    expect(toColorSpace(color.ColorSpace.get("display-p3"))).toBe("p3");
    expect(toColorSpace(color.ColorSpace.get("a98-rgb"))).toBe("a98rgb");
    expect(toColorSpace(color.ColorSpace.get("prophoto-rgb"))).toBe("prophoto");
    expect(toColorSpace(color.ColorSpace.get("xyz"))).toBe("xyz-d65");
  });
});

describe("srgbColor", () => {
  test("creates a PlainColorObject with sRGB space", () => {
    const color = srgbColor(0.5, 0.25, 0.75);
    expect(color.coords).toEqual([0.5, 0.25, 0.75]);
    expect(color.alpha).toBe(1);
    expect(color.space).toBe(sRGB);
  });
  test("accepts custom alpha", () => {
    const color = srgbColor(1, 0, 0, 0.5);
    expect(color.alpha).toBe(0.5);
  });
});

describe("transparentColor", () => {
  test("is black with zero alpha", () => {
    expect(transparentColor.coords).toEqual([0, 0, 0]);
    expect(transparentColor.alpha).toBe(0);
  });
});

describe("whiteColor", () => {
  test("is white with full alpha", () => {
    expect(whiteColor.coords).toEqual([1, 1, 1]);
    expect(whiteColor.alpha).toBe(1);
  });
});

describe("parseColor", () => {
  test("parses hex color to sRGB", () => {
    const color = parseColor("#ff0000");
    expect(color.coords[0]).toBeCloseTo(1, 4);
    expect(color.coords[1]).toBeCloseTo(0, 4);
    expect(color.coords[2]).toBeCloseTo(0, 4);
    expect(color.alpha).toBe(1);
  });
  test("parses rgba color", () => {
    const color = parseColor("rgba(0, 128, 255, 0.5)");
    expect(color.coords[0]).toBeCloseTo(0, 4);
    expect(color.coords[1]).toBeCloseTo(128 / 255, 2);
    expect(color.coords[2]).toBeCloseTo(1, 4);
    expect(color.alpha).toBeCloseTo(0.5, 4);
  });
  test("parses named colors", () => {
    const color = parseColor("white");
    expect(color.coords[0]).toBeCloseTo(1, 4);
    expect(color.coords[1]).toBeCloseTo(1, 4);
    expect(color.coords[2]).toBeCloseTo(1, 4);
  });
  test("parses oklch color to sRGB", () => {
    const color = parseColor("oklch(0.7 0.15 180)");
    // Just check it returns valid sRGB coords
    expect(color.coords).toHaveLength(3);
    expect(color.alpha).toBe(1);
  });
  test("returns transparentColor for unparseable strings", () => {
    const color = parseColor("not-a-color");
    // In non-browser env, canvas fallback returns undefined, so we get transparentColor
    expect(color.alpha).toBe(0);
  });
});

describe("colorDistance", () => {
  test("distance between identical colors is 0", () => {
    const red = srgbColor(1, 0, 0);
    expect(colorDistance(red, red)).toBe(0);
  });
  test("distance between black and white", () => {
    const black = srgbColor(0, 0, 0);
    const white = srgbColor(1, 1, 1);
    expect(colorDistance(black, white)).toBeCloseTo(Math.sqrt(3), 10);
  });
  test("includes alpha in distance calculation", () => {
    const a = srgbColor(0, 0, 0, 0);
    const b = srgbColor(0, 0, 0, 1);
    expect(colorDistance(a, b)).toBe(1);
  });
  test("distance between red and green", () => {
    const red = srgbColor(1, 0, 0);
    const green = srgbColor(0, 1, 0);
    expect(colorDistance(red, green)).toBeCloseTo(Math.sqrt(2), 10);
  });
});

describe("lerpColor", () => {
  test("ratio 0 returns first color", () => {
    const a = srgbColor(0, 0, 0);
    const b = srgbColor(1, 1, 1);
    const result = lerpColor(a, b, 0);
    expect(result.coords).toEqual([0, 0, 0]);
    expect(result.alpha).toBe(1);
  });
  test("ratio 1 returns second color", () => {
    const a = srgbColor(0, 0, 0);
    const b = srgbColor(1, 1, 1);
    const result = lerpColor(a, b, 1);
    expect(result.coords).toEqual([1, 1, 1]);
    expect(result.alpha).toBe(1);
  });
  test("ratio 0.5 returns midpoint", () => {
    const a = srgbColor(0, 0, 0);
    const b = srgbColor(1, 1, 1);
    const result = lerpColor(a, b, 0.5);
    expect(result.coords[0]).toBeCloseTo(0.5, 10);
    expect(result.coords[1]).toBeCloseTo(0.5, 10);
    expect(result.coords[2]).toBeCloseTo(0.5, 10);
  });
  test("interpolates alpha", () => {
    const a = srgbColor(0, 0, 0, 0);
    const b = srgbColor(0, 0, 0, 1);
    const result = lerpColor(a, b, 0.25);
    expect(result.alpha).toBeCloseTo(0.25, 10);
  });
});

describe("serializeColor", () => {
  test("serializes opaque sRGB color to rgb()", () => {
    const color = srgbColor(1, 0, 0.5);
    expect(serializeColor(color)).toBe("rgb(255, 0, 128)");
  });
  test("serializes semi-transparent color to rgba()", () => {
    const color = srgbColor(0, 1, 0, 0.5);
    expect(serializeColor(color)).toBe("rgba(0, 255, 0, 0.5)");
  });
  test("serializes black", () => {
    expect(serializeColor(srgbColor(0, 0, 0))).toBe("rgb(0, 0, 0)");
  });
  test("serializes white", () => {
    expect(serializeColor(whiteColor)).toBe("rgb(255, 255, 255)");
  });
  test("serializes transparent color", () => {
    expect(serializeColor(transparentColor)).toBe("rgba(0, 0, 0, 0)");
  });
  test("rounds components to integers", () => {
    const color = srgbColor(0.502, 0.502, 0.502);
    expect(serializeColor(color)).toBe("rgb(128, 128, 128)");
  });
});
