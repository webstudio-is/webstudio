import { describe, test, expect, vi } from "vitest";

vi.mock("hdr-color-input", () => ({}));

import { cssStringToStyleValue } from "./color-picker";

// All ColorSpace values from hdr-color-input and their expected CSS input strings
// (as <color-input> would emit in its change event).
describe("cssStringToStyleValue", () => {
  test("hex – stores sRGB coords tagged as hex colorSpace", () => {
    expect(cssStringToStyleValue("#ff0000", "hex")).toEqual({
      type: "color",
      colorSpace: "hex",
      components: [1, 0, 0],
      alpha: 1,
    });
  });

  test("hex with alpha", () => {
    expect(cssStringToStyleValue("#ff000080", "hex")).toEqual({
      type: "color",
      colorSpace: "hex",
      components: [1, 0, 0],
      alpha: 0.502,
    });
  });

  test("srgb", () => {
    expect(cssStringToStyleValue("rgb(0 128 255)", "srgb")).toEqual({
      type: "color",
      colorSpace: "srgb",
      components: [0, 0.502, 1],
      alpha: 1,
    });
  });

  test("hsl", () => {
    expect(cssStringToStyleValue("hsl(120 100% 50%)", "hsl")).toEqual({
      type: "color",
      colorSpace: "hsl",
      components: [120, 100, 50],
      alpha: 1,
    });
  });

  test("hwb", () => {
    expect(cssStringToStyleValue("hwb(120 0% 0%)", "hwb")).toEqual({
      type: "color",
      colorSpace: "hwb",
      components: [120, 0, 0],
      alpha: 1,
    });
  });

  test("lab", () => {
    expect(cssStringToStyleValue("lab(50 20 30)", "lab")).toEqual({
      type: "color",
      colorSpace: "lab",
      components: [50, 20, 30],
      alpha: 1,
    });
  });

  test("lch", () => {
    expect(cssStringToStyleValue("lch(50 40 120)", "lch")).toEqual({
      type: "color",
      colorSpace: "lch",
      components: [50, 40, 120],
      alpha: 1,
    });
  });

  test("oklab", () => {
    expect(cssStringToStyleValue("oklab(0.7 0.1 -0.1)", "oklab")).toEqual({
      type: "color",
      colorSpace: "oklab",
      components: [0.7, 0.1, -0.1],
      alpha: 1,
    });
  });

  test("oklch", () => {
    expect(cssStringToStyleValue("oklch(0.7 0.1 180)", "oklch")).toEqual({
      type: "color",
      colorSpace: "oklch",
      components: [0.7, 0.1, 180],
      alpha: 1,
    });
  });

  test("srgb-linear", () => {
    expect(
      cssStringToStyleValue("color(srgb-linear 1 0 0)", "srgb-linear")
    ).toEqual({
      type: "color",
      colorSpace: "srgb-linear",
      components: [1, 0, 0],
      alpha: 1,
    });
  });

  test("display-p3 maps to p3 colorSpace", () => {
    expect(
      cssStringToStyleValue("color(display-p3 0.4 0.6 0.3)", "display-p3")
    ).toEqual({
      type: "color",
      colorSpace: "p3",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("a98-rgb maps to a98rgb colorSpace", () => {
    expect(
      cssStringToStyleValue("color(a98-rgb 0.4 0.6 0.3)", "a98-rgb")
    ).toEqual({
      type: "color",
      colorSpace: "a98rgb",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("prophoto", () => {
    expect(
      cssStringToStyleValue("color(prophoto-rgb 0.4 0.6 0.3)", "prophoto")
    ).toEqual({
      type: "color",
      colorSpace: "prophoto",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("rec2020", () => {
    expect(
      cssStringToStyleValue("color(rec2020 0.4 0.6 0.3)", "rec2020")
    ).toEqual({
      type: "color",
      colorSpace: "rec2020",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("xyz maps to xyz-d65 colorSpace", () => {
    expect(cssStringToStyleValue("color(xyz 0.4 0.6 0.3)", "xyz")).toEqual({
      type: "color",
      colorSpace: "xyz-d65",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("xyz-d65", () => {
    expect(
      cssStringToStyleValue("color(xyz-d65 0.4 0.6 0.3)", "xyz-d65")
    ).toEqual({
      type: "color",
      colorSpace: "xyz-d65",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("xyz-d50", () => {
    expect(
      cssStringToStyleValue("color(xyz-d50 0.4 0.6 0.3)", "xyz-d50")
    ).toEqual({
      type: "color",
      colorSpace: "xyz-d50",
      components: [0.4, 0.6, 0.3],
      alpha: 1,
    });
  });

  test("alpha channel is preserved", () => {
    expect(cssStringToStyleValue("oklch(0.7 0.1 180 / 0.5)", "oklch")).toEqual({
      type: "color",
      colorSpace: "oklch",
      components: [0.7, 0.1, 180],
      alpha: 0.5,
    });
  });
});
