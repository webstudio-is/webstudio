import { test, describe, expect } from "vitest";
import { parseLinearGradient, formatLinearGradient } from "./linear-gradient";

type LinearGradient = NonNullable<ReturnType<typeof parseLinearGradient>>;
const linear = (gradient: Omit<LinearGradient, "type">): LinearGradient => ({
  type: "linear",
  ...gradient,
});

describe("parses linear-gradient", () => {
  test("parses gradient without angle, sides and color-stops", () => {
    expect(parseLinearGradient("linear-gradient(red, blue, yellow)")).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 1, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with angle and color-stops", () => {
    expect(
      parseLinearGradient("linear-gradient(135deg, orange 60% 20%, 40%, cyan)")
    ).toEqual(
      linear({
        angle: { type: "unit", unit: "deg", value: 135 },
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0.6471, 0],
              alpha: 1,
            },
            hint: { type: "unit", unit: "%", value: 20 },
            position: { type: "unit", unit: "%", value: 60 },
          },
          { hint: { type: "unit", unit: "%", value: 40 } },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 1, 1],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with side-or-corer and multiple colors without stops", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(to top right, orange, yellow, blue, green)"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: { type: "keyword", value: "to top right" },
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0.6471, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 1, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0.502, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with multiple angles and color-stops", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(to right, red 20%, orange 20% 40%, yellow 40% 60%, green 60% 80%, blue 80% )"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: { type: "keyword", value: "to right" },
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            hint: undefined,
            position: { type: "unit", unit: "%", value: 20 },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0.6471, 0],
              alpha: 1,
            },
            hint: { type: "unit", unit: "%", value: 40 },
            position: { type: "unit", unit: "%", value: 20 },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 1, 0],
              alpha: 1,
            },
            hint: { type: "unit", unit: "%", value: 60 },
            position: { type: "unit", unit: "%", value: 40 },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0.502, 0],
              alpha: 1,
            },
            hint: { type: "unit", unit: "%", value: 80 },
            position: { type: "unit", unit: "%", value: 60 },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            hint: undefined,
            position: { type: "unit", unit: "%", value: 80 },
          },
        ],
      })
    );
  });

  test("parses linear-gradient with rgb values", () => {
    const parsed = parseLinearGradient(
      "linear-gradient(rgb(255, 0, 0), rgb(0, 255, 0), rgb(0, 0, 255))"
    );
    if (parsed === undefined) {
      throw new Error("parsed is undefined");
    }

    expect(formatLinearGradient(parsed)).toEqual(
      "linear-gradient(rgb(255 0 0 / 1), rgb(0 255 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("parses repeating-linear-gradient", () => {
    const parsed = parseLinearGradient("repeating-linear-gradient(red, blue)");
    if (parsed === undefined) {
      throw new Error("parsed is undefined");
    }

    expect(parsed.repeating).toBe(true);
    expect(formatLinearGradient(parsed)).toEqual(
      "repeating-linear-gradient(rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("parses linear-gradient with css variables", () => {
    expect(
      parseLinearGradient("linear-gradient(var(--brand-color), blue)")
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "var",
              value: "brand-color",
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with css variables and fallbacks", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(var(--heading-color, #ff0000) 25% 50%, yellow)"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "var",
              value: "heading-color",
              fallback: { type: "unparsed", value: "#ff0000" },
            },
            position: { type: "unit", unit: "%", value: 25 },
            hint: { type: "unit", unit: "%", value: 50 },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 1, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with keyword and variable mix", () => {
    const parsed = parseLinearGradient(
      "linear-gradient(to bottom, green 0%, var(--accent))"
    );
    expect(parsed).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: { type: "keyword", value: "to bottom" },
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0.502, 0],
              alpha: 1,
            },
            hint: undefined,
            position: { type: "unit", unit: "%", value: 0 },
          },
          {
            color: { type: "var", value: "accent" },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
    if (parsed) {
      expect(formatLinearGradient(parsed)).toEqual(
        "linear-gradient(to bottom, rgb(0 128 0 / 1) 0%, var(--accent))"
      );
    }
  });

  test("parses linear-gradient with css variable positions", () => {
    const parsed = parseLinearGradient(
      "linear-gradient(rgba(255, 0, 0, 1) var(--start, 10%), blue var(--end))"
    );
    expect(parsed).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            hint: undefined,
            position: {
              type: "var",
              value: "start",
              fallback: { type: "unparsed", value: "10%" },
            },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            hint: undefined,
            position: { type: "var", value: "end" },
          },
        ],
      })
    );
    if (parsed) {
      expect(formatLinearGradient(parsed)).toEqual(
        "linear-gradient(rgb(255 0 0 / 1) var(--start, 10%), rgb(0 0 255 / 1) var(--end))"
      );
    }
  });

  test("parses linear-gradient with css variable hints", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(red 0% var(--hint-position, 20%), blue)"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 0 },
            hint: {
              type: "var",
              value: "hint-position",
              fallback: { type: "unparsed", value: "20%" },
            },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with variable colors, positions, and hints", () => {
    const gradient =
      "linear-gradient(var(--primary, red) var(--start, 5%) var(--hint-start, 10%), var(--secondary) var(--end) var(--hint-end))";
    const parsed = parseLinearGradient(gradient);
    expect(parsed).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "var",
              value: "primary",
              fallback: { type: "unparsed", value: "red" },
            },
            position: {
              type: "var",
              value: "start",
              fallback: { type: "unparsed", value: "5%" },
            },
            hint: {
              type: "var",
              value: "hint-start",
              fallback: { type: "unparsed", value: "10%" },
            },
          },
          {
            color: { type: "var", value: "secondary" },
            position: { type: "var", value: "end" },
            hint: { type: "var", value: "hint-end" },
          },
        ],
      })
    );
    if (parsed) {
      expect(formatLinearGradient(parsed)).toEqual(gradient);
    }
  });

  test("returns undefined for invalid gradient input", () => {
    expect(parseLinearGradient("linear-gradient(var())")).toBeUndefined();
    expect(parseLinearGradient("linear-gradient(, , ,)")).toBeUndefined();
  });

  test("parses linear-gradient with variable angle", () => {
    const parsed = parseLinearGradient(
      "linear-gradient(var(--angle, 45deg), red, blue)"
    );
    if (parsed === undefined) {
      throw new Error("parsed is undefined");
    }

    expect(parsed.angle).toMatchObject({
      type: "var",
      value: "angle",
    });
    expect(formatLinearGradient(parsed)).toEqual(
      "linear-gradient(var(--angle, 45deg), rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("parses linear-gradient with radian angle", () => {
    expect(parseLinearGradient("linear-gradient(0.5rad, red, blue)")).toEqual(
      linear({
        angle: { type: "unit", unit: "rad", value: 0.5 },
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with oklch colors", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(oklch(0.6 0.1 180), oklch(0.8 0.15 240))"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "oklch",
              components: [0.6, 0.1, 180],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "oklch",
              components: [0.8, 0.15, 240],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with hsl colors", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(hsl(180 100% 50%), hsl(240 100% 50%))"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "hsl",
              components: [180, 100, 50],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "hsl",
              components: [240, 100, 50],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with color() function", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(color(srgb 1 0 0), color(srgb 0 0 1))"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });

  test("parses linear-gradient with mixed modern color spaces", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(90deg, oklch(0.7 0.2 30) 0%, hsl(120deg 50% 60%) 50%, color(display-p3 0 1 0) 100%)"
      )
    ).toEqual(
      linear({
        angle: { type: "unit", unit: "deg", value: 90 },
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "oklch",
              components: [0.7, 0.2, 30],
              alpha: 1,
            },
            hint: undefined,
            position: { type: "unit", unit: "%", value: 0 },
          },
          {
            color: {
              type: "color",
              colorSpace: "hsl",
              components: [120, 50, 60],
              alpha: 1,
            },
            hint: undefined,
            position: { type: "unit", unit: "%", value: 50 },
          },
          {
            color: {
              type: "color",
              colorSpace: "p3",
              components: [0, 1, 0],
              alpha: 1,
            },
            hint: undefined,
            position: { type: "unit", unit: "%", value: 100 },
          },
        ],
      })
    );
  });

  test("parses linear-gradient with oklch colors with alpha", () => {
    expect(
      parseLinearGradient(
        "linear-gradient(oklch(0.6 0.1 180 / 0.5), oklch(0.8 0.15 240 / 0.8))"
      )
    ).toEqual(
      linear({
        angle: undefined,
        sideOrCorner: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "oklch",
              components: [0.6, 0.1, 180],
              alpha: 0.5,
            },
            hint: undefined,
            position: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "oklch",
              components: [0.8, 0.15, 240],
              alpha: 0.8,
            },
            hint: undefined,
            position: undefined,
          },
        ],
      })
    );
  });
});
