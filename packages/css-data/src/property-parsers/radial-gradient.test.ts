import { describe, expect, test } from "vitest";
import { parseRadialGradient, formatRadialGradient } from "./radial-gradient";

// casts helper similar to other gradient tests
type RadialGradient = NonNullable<ReturnType<typeof parseRadialGradient>>;
const radial = (gradient: Omit<RadialGradient, "type">): RadialGradient => ({
  type: "radial",
  ...gradient,
});

describe("parse radial-gradient", () => {
  test("parses gradient with single color stop", () => {
    expect(parseRadialGradient("radial-gradient(red)")).toEqual(
      radial({
        shape: undefined,
        size: undefined,
        position: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses gradient with shape and multiple stops", () => {
    expect(
      parseRadialGradient("radial-gradient(circle, red, blue, yellow)")
    ).toEqual(
      radial({
        shape: { type: "keyword", value: "circle" },
        size: undefined,
        position: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
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
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 1, 0],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses gradient with shape, size, position and stops", () => {
    expect(
      parseRadialGradient(
        "radial-gradient(circle closest-side at center, orange 0%, cyan 100%)"
      )
    ).toEqual(
      radial({
        shape: { type: "keyword", value: "circle" },
        size: "closest-side",
        position: "center",
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0.6471, 0],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 0 },
            hint: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 1, 1],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 100 },
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses ellipse with keyword size and keyword position", () => {
    expect(
      parseRadialGradient(
        "radial-gradient(ellipse farthest-corner at left top, red 0%, blue 100%)"
      )
    ).toEqual(
      radial({
        shape: { type: "keyword", value: "ellipse" },
        size: "farthest-corner",
        position: "left top",
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 0 },
            hint: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 100 },
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses gradient with size keyword only", () => {
    expect(
      parseRadialGradient("radial-gradient(closest-side, red, blue)")
    ).toEqual(
      radial({
        shape: undefined,
        size: "closest-side",
        position: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
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

  test("parses circle with explicit radius length", () => {
    expect(
      parseRadialGradient("radial-gradient(circle 25px, red, blue)")
    ).toEqual(
      radial({
        shape: { type: "keyword", value: "circle" },
        size: "25px",
        position: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
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

  test("parses ellipse with explicit radii", () => {
    expect(
      parseRadialGradient("radial-gradient(ellipse 20% 40%, red, blue)")
    ).toEqual(
      radial({
        shape: { type: "keyword", value: "ellipse" },
        size: "20% 40%",
        position: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
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

  test("parses descriptors regardless of ordering", () => {
    expect(
      parseRadialGradient(
        "radial-gradient(farthest-side circle at 40px 40px, red, blue)"
      )
    ).toEqual(
      radial({
        shape: { type: "keyword", value: "circle" },
        size: "farthest-side",
        position: "40px 40px",
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: undefined,
            hint: undefined,
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

  test("parses gradient with explicit size values and position coordinates", () => {
    expect(
      parseRadialGradient(
        "radial-gradient(20px 40px at 10px 20px, red 10% 40%, blue 80%)"
      )
    ).toEqual(
      radial({
        shape: undefined,
        size: "20px 40px",
        position: "10px 20px",
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 10 },
            hint: { type: "unit", unit: "%", value: 40 },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 80 },
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses radial-gradient with css variables", () => {
    expect(
      parseRadialGradient(
        "radial-gradient(circle, var(--brand-color), var(--accent-color))"
      )
    ).toEqual(
      radial({
        shape: { type: "keyword", value: "circle" },
        size: undefined,
        position: undefined,
        stops: [
          {
            color: { type: "var", value: "brand-color" },
            position: undefined,
            hint: undefined,
          },
          {
            color: { type: "var", value: "accent-color" },
            position: undefined,
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses repeating radial-gradient and formats back", () => {
    const parsed = parseRadialGradient(
      "repeating-radial-gradient(red 0%, blue 100%)"
    );
    if (parsed === undefined) {
      throw new Error("parsed radial gradient is undefined");
    }

    expect(parsed.repeating).toBe(true);
    expect(formatRadialGradient(parsed)).toEqual(
      "repeating-radial-gradient(rgb(255 0 0 / 1) 0%, rgb(0 0 255 / 1) 100%)"
    );
  });

  test("formats gradient with descriptors in order", () => {
    const parsed = parseRadialGradient(
      "radial-gradient(circle 40px at top, red, blue)"
    );
    if (parsed === undefined) {
      throw new Error("parsed radial gradient is undefined");
    }

    expect(formatRadialGradient(parsed)).toEqual(
      "radial-gradient(circle 40px at top, rgb(255 0 0 / 1), rgb(0 0 255 / 1))"
    );
  });
});
