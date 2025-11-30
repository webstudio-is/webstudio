import { describe, test, expect } from "vitest";
import { toValue } from "./to-value";

describe("Convert WS CSS Values to native CSS strings", () => {
  test("keyword", () => {
    const value = toValue({ type: "keyword", value: "red" });
    expect(value).toBe("red");
  });

  test("unit", () => {
    const value = toValue({ type: "unit", value: 10, unit: "px" });
    expect(value).toBe("10px");
  });

  test("invalid", () => {
    const value = toValue({ type: "invalid", value: "bad" });
    expect(value).toBe("bad");
  });

  test("unset", () => {
    const value = toValue({ type: "unset", value: "" });
    expect(value).toBe("");
  });

  test("var", () => {
    const value = toValue({ type: "var", value: "namespace" });
    expect(value).toBe("var(--namespace)");
  });

  test("var with fallbacks", () => {
    const value = toValue({
      type: "var",
      value: "namespace",
      fallback: {
        type: "unparsed",
        value: "normal, 10px",
      },
    });
    expect(value).toBe("var(--namespace, normal, 10px)");
  });

  test("fontFamily is known stack name", () => {
    expect(
      toValue({
        type: "fontFamily",
        value: ["Humanist"],
      })
    ).toBe(
      'Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans", source-sans-pro, sans-serif'
    );
  });

  test("fontFamily is a custom stack", () => {
    expect(
      toValue({
        type: "fontFamily",
        value: ["DejaVu Sans Mono", "monospace"],
      })
    ).toBe('"DejaVu Sans Mono", monospace');
  });

  test("fontFamily is unknown family name", () => {
    expect(
      toValue({
        type: "fontFamily",
        value: ["something-random"],
      })
    ).toBe("something-random, sans-serif");
  });

  test("fontFamily is empty", () => {
    expect(
      toValue({
        type: "fontFamily",
        value: [],
      })
    ).toBe("sans-serif");
  });

  test("fontFamily has duplicates", () => {
    expect(
      toValue({
        type: "fontFamily",
        value: ["a", "a", "b"],
      })
    ).toBe("a, b");
  });

  test("Transform font family value to override default fallback", () => {
    const value = toValue(
      {
        type: "fontFamily",
        value: ["Courier New"],
      },
      (styleValue) => {
        if (styleValue.type === "fontFamily") {
          return {
            type: "fontFamily",
            value: ["A B"],
          };
        }
      }
    );
    expect(value).toBe('"A B"');
  });

  test("array", () => {
    const assets = new Map<string, { path: string }>([
      ["1234567890", { path: "foo.png" }],
    ]);

    const value = toValue(
      {
        type: "layers",
        value: [
          {
            type: "keyword",
            value: "auto",
          },
          { type: "unit", value: 10, unit: "px" },
          { type: "unparsed", value: "calc(10px)" },
          {
            type: "image",
            value: {
              type: "asset",
              value: "1234567890",
            },
          },
        ],
      },
      (styleValue) => {
        if (styleValue.type === "image" && styleValue.value.type === "asset") {
          const asset = assets.get(styleValue.value.value);
          if (asset === undefined) {
            return {
              type: "keyword",
              value: "none",
            };
          }
          return {
            type: "image",
            value: {
              type: "url",
              url: asset.path,
            },
          };
        }
      }
    );

    expect(value).toBe(`auto, 10px, calc(10px), url("foo.png")`);
  });

  test("tuple", () => {
    const value = toValue({
      type: "tuple",
      value: [
        { type: "unit", value: 10, unit: "px" },
        { type: "unit", value: 20, unit: "px" },
        { type: "unit", value: 30, unit: "px" },
        { type: "unit", value: 40, unit: "px" },
      ],
    });
    expect(value).toBe("10px 20px 30px 40px");
  });

  test("function", () => {
    const translate3D = toValue({
      type: "function",
      name: "translate3d",
      args: {
        type: "keyword",
        value: "42px, -62px, -135px",
      },
    });

    const dropShadowValue = toValue({
      type: "function",
      name: "drop-shadow",
      args: {
        type: "shadow",
        position: "outset",
        offsetX: { type: "unit", value: 10, unit: "px" },
        offsetY: { type: "unit", value: 10, unit: "px" },
        blur: { type: "unit", value: 10, unit: "px" },
        color: { type: "keyword", value: "red" },
      },
    });

    expect(translate3D).toBe("translate3d(42px, -62px, -135px)");
    expect(dropShadowValue).toBe("drop-shadow(10px 10px 10px red)");
  });

  test("sanitize url", () => {
    const assets = new Map<string, { path: string }>([
      ["1234567890", { path: `fo"o\\o.png` }],
    ]);

    const value = toValue(
      {
        type: "image",
        value: {
          type: "asset",
          value: "1234567890",
        },
      },
      (styleValue) => {
        if (styleValue.type === "image" && styleValue.value.type === "asset") {
          const asset = assets.get(styleValue.value.value);
          if (asset === undefined) {
            return {
              type: "keyword",
              value: "none",
            };
          }
          return {
            type: "image",
            value: {
              type: "url",
              url: asset.path,
            },
          };
        }
      }
    );

    expect(value).toMatchInlineSnapshot(`"url("fo\\"o\\\\o.png")"`);
  });

  test("guaranteed-invalid", () => {
    const value = toValue({
      type: "guaranteedInvalid",
    });
    expect(value).toBe("");
  });

  test("color with srgb color space", () => {
    const value = toValue({
      type: "color",
      colorSpace: "srgb",
      components: [1, 0.5, 0.2],
      alpha: 1,
    });
    expect(value).toBe("rgb(255 128 51 / 1)");
  });

  test("color with srgb and alpha channel", () => {
    const value = toValue({
      type: "color",
      colorSpace: "srgb",
      components: [1, 0, 0],
      alpha: 0.5,
    });
    expect(value).toBe("rgb(255 0 0 / 0.5)");
  });

  test("color with srgb and zero alpha", () => {
    const value = toValue({
      type: "color",
      colorSpace: "srgb",
      components: [0.5, 0.5, 0.5],
      alpha: 0,
    });
    expect(value).toBe("rgb(128 128 128 / 0)");
  });

  test("color with hsl color space", () => {
    const value = toValue({
      type: "color",
      colorSpace: "hsl",
      components: [120, 100, 50],
      alpha: 1,
    });
    expect(value).toBe("hsl(120 100% 50% / 1)");
  });

  test("color with hwb color space", () => {
    const value = toValue({
      type: "color",
      colorSpace: "hwb",
      components: [45, 10, 20],
      alpha: 1,
    });
    expect(value).toBe("hwb(45 10% 20% / 1)");
  });

  test("color with lab color space", () => {
    const value = toValue({
      type: "color",
      colorSpace: "lab",
      components: [50, 20, 30],
      alpha: 1,
    });
    expect(value).toBe("lab(50% 20 30 / 1)");
  });

  test("color with lch color space", () => {
    const value = toValue({
      type: "color",
      colorSpace: "lch",
      components: [50, 20, 120],
      alpha: 1,
    });
    expect(value).toBe("lch(50% 20 120 / 1)");
  });

  test("color with oklab color space", () => {
    const value = toValue({
      type: "color",
      colorSpace: "oklab",
      components: [0.6, 0.1, -0.1],
      alpha: 1,
    });
    expect(value).toBe("oklab(0.6 0.1 -0.1 / 1)");
  });

  test("color with oklch color space", () => {
    const value = toValue({
      type: "color",
      colorSpace: "oklch",
      components: [0.5, 0.1, 180],
      alpha: 1,
    });
    expect(value).toBe("oklch(0.5 0.1 180 / 1)");
  });

  test("color with p3 color space uses color() function", () => {
    const value = toValue({
      type: "color",
      colorSpace: "p3",
      components: [0.8, 0.4, 0.6],
      alpha: 0.8,
    });
    expect(value).toBe("color(p3 0.8 0.4 0.6 / 0.8)");
  });

  test("color with xyz-d65 uses color() function", () => {
    const value = toValue({
      type: "color",
      colorSpace: "xyz-d65",
      components: [0.5, 0.3, 0.2],
      alpha: 1,
    });
    expect(value).toBe("color(xyz-d65 0.5 0.3 0.2 / 1)");
  });

  test("color in tuple", () => {
    const value = toValue({
      type: "tuple",
      value: [
        {
          type: "color",
          colorSpace: "oklch",
          components: [0.5, 0.1, 180],
          alpha: 1,
        },
        { type: "unit", value: 10, unit: "px" },
      ],
    });
    expect(value).toBe("oklch(0.5 0.1 180 / 1) 10px");
  });

  test("color in shadow", () => {
    const value = toValue({
      type: "shadow",
      position: "outset",
      offsetX: { type: "unit", value: 1, unit: "px" },
      offsetY: { type: "unit", value: 2, unit: "px" },
      color: {
        type: "color",
        colorSpace: "hsl",
        components: [240, 100, 50],
        alpha: 0.7,
      },
    });
    expect(value).toBe("1px 2px hsl(240 100% 50% / 0.7)");
  });
});

describe("serialize shadow value", () => {
  test("minimal value", () => {
    expect(
      toValue({
        type: "layers",
        value: [
          {
            type: "shadow",
            position: "outset",
            offsetX: { type: "unit", value: 1, unit: "px" },
            offsetY: { type: "unit", value: 2, unit: "px" },
          },
        ],
      })
    ).toEqual("1px 2px");
  });

  test("full value", () => {
    expect(
      toValue({
        type: "layers",
        value: [
          {
            type: "shadow",
            position: "inset",
            offsetX: { type: "unit", value: 1, unit: "px" },
            offsetY: { type: "unit", value: 2, unit: "px" },
            blur: { type: "unit", value: 3, unit: "px" },
            spread: { type: "unit", value: 4, unit: "px" },
            color: { type: "rgb", r: 0, g: 0, b: 0, alpha: 1 },
          },
        ],
      })
    ).toEqual("1px 2px 3px 4px rgb(0 0 0 / 1) inset");
  });

  test("hidden value", () => {
    expect(
      toValue({
        type: "layers",
        value: [
          {
            type: "shadow",
            hidden: true,
            position: "outset",
            offsetX: { type: "unit", value: 1, unit: "px" },
            offsetY: { type: "unit", value: 2, unit: "px" },
          },
        ],
      })
    ).toEqual("none");
  });

  test("multiple values", () => {
    expect(
      toValue({
        type: "layers",
        value: [
          {
            type: "shadow",
            position: "outset",
            offsetX: { type: "unit", value: 1, unit: "px" },
            offsetY: { type: "unit", value: 2, unit: "px" },
          },
          {
            type: "shadow",
            position: "outset",
            offsetX: { type: "unit", value: 3, unit: "px" },
            offsetY: { type: "unit", value: 4, unit: "px" },
          },
        ],
      })
    ).toEqual("1px 2px, 3px 4px");
  });
});
