import { describe, expect, test } from "vitest";
import { parseConicGradient, formatConicGradient } from "./conic-gradient";

type ConicGradient = NonNullable<ReturnType<typeof parseConicGradient>>;
const conic = (gradient: Omit<ConicGradient, "type">): ConicGradient => ({
  type: "conic",
  ...gradient,
});

describe("parse conic-gradient", () => {
  test("parses gradient without angle or position", () => {
    expect(
      parseConicGradient("conic-gradient(red 0%, blue 50%, yellow 100%)")
    ).toEqual(
      conic({
        angle: undefined,
        position: undefined,
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
            position: { type: "unit", unit: "%", value: 50 },
            hint: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 1, 0],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 100 },
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses gradient with angle", () => {
    expect(
      parseConicGradient("conic-gradient(from 135deg, orange 0%, cyan 100%)")
    ).toEqual(
      conic({
        angle: { type: "unit", unit: "deg", value: 135 },
        position: undefined,
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

  test("parses gradient with position", () => {
    expect(
      parseConicGradient("conic-gradient(at center, red 0%, blue 100%)")
    ).toEqual(
      conic({
        angle: undefined,
        position: "center",
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

  test("parses gradient with angle positions", () => {
    expect(
      parseConicGradient(
        "conic-gradient(from 0deg at 50% 50%, rgba(255,126,95,1) 0deg, rgba(254,180,123,1) 120deg, rgba(134,168,231,1) 240deg, rgba(255,126,95,1) 360deg)"
      )
    ).toEqual(
      conic({
        angle: { type: "unit", unit: "deg", value: 0 },
        position: "50% 50%",
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0.4941, 0.3725],
              alpha: 1,
            },
            position: { type: "unit", unit: "deg", value: 0 },
            hint: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0.9961, 0.7059, 0.4824],
              alpha: 1,
            },
            position: { type: "unit", unit: "deg", value: 120 },
            hint: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0.5255, 0.6588, 0.9059],
              alpha: 1,
            },
            position: { type: "unit", unit: "deg", value: 240 },
            hint: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0.4941, 0.3725],
              alpha: 1,
            },
            position: { type: "unit", unit: "deg", value: 360 },
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses repeating conic gradient", () => {
    const parsed = parseConicGradient(
      "repeating-conic-gradient(red 0% 25%, blue 50% 75%)"
    );
    expect(parsed).toEqual(
      conic({
        angle: undefined,
        position: undefined,
        repeating: true,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 0 },
            hint: { type: "unit", unit: "%", value: 25 },
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0, 1],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 50 },
            hint: { type: "unit", unit: "%", value: 75 },
          },
        ],
      })
    );
    expect(formatConicGradient(parsed!)).toBe(
      "repeating-conic-gradient(rgb(255 0 0 / 1) 0% 25%, rgb(0 0 255 / 1) 50% 75%)"
    );
  });

  test("parses gradient with css variables", () => {
    expect(
      parseConicGradient(
        "conic-gradient(from var(--angle, 45deg), var(--start-color, red) var(--start, 0%) var(--start-hint, 5%), var(--end-color) var(--end))"
      )
    ).toEqual(
      conic({
        angle: {
          type: "var",
          value: "angle",
          fallback: { type: "unparsed", value: "45deg" },
        },
        position: undefined,
        stops: [
          {
            color: {
              type: "var",
              value: "start-color",
              fallback: { type: "unparsed", value: "red" },
            },
            position: {
              type: "var",
              value: "start",
              fallback: { type: "unparsed", value: "0%" },
            },
            hint: {
              type: "var",
              value: "start-hint",
              fallback: { type: "unparsed", value: "5%" },
            },
          },
          {
            color: { type: "var", value: "end-color" },
            position: { type: "var", value: "end" },
            hint: undefined,
          },
        ],
      })
    );
  });

  test("parses gradient with variable angle without fallback", () => {
    expect(
      parseConicGradient("conic-gradient(from var(--angle), red 0%, blue 100%)")
    ).toEqual(
      conic({
        angle: {
          type: "var",
          value: "angle",
        },
        position: undefined,
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

  test("parses gradient with variable positions and hints", () => {
    const parsed = parseConicGradient(
      "conic-gradient(red var(--start, 10%) var(--hint, 20%), blue var(--end))"
    );
    expect(parsed).toEqual(
      conic({
        angle: undefined,
        position: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 0, 0],
              alpha: 1,
            },
            position: {
              type: "var",
              value: "start",
              fallback: { type: "unparsed", value: "10%" },
            },
            hint: {
              type: "var",
              value: "hint",
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
            position: { type: "var", value: "end" },
            hint: undefined,
          },
        ],
      })
    );
    expect(formatConicGradient(parsed!)).toBe(
      "conic-gradient(rgb(255 0 0 / 1) var(--start, 10%) var(--hint, 20%), rgb(0 0 255 / 1) var(--end))"
    );
  });

  test("parses keyword colors", () => {
    const parsed = parseConicGradient(
      "conic-gradient(green 0%, blue 50%, yellow 100%)"
    );
    expect(parsed).toEqual(
      conic({
        angle: undefined,
        position: undefined,
        stops: [
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [0, 0.502, 0],
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
            position: { type: "unit", unit: "%", value: 50 },
            hint: undefined,
          },
          {
            color: {
              type: "color",
              colorSpace: "srgb",
              components: [1, 1, 0],
              alpha: 1,
            },
            position: { type: "unit", unit: "%", value: 100 },
            hint: undefined,
          },
        ],
      })
    );
    expect(formatConicGradient(parsed!)).toBe(
      "conic-gradient(rgb(0 128 0 / 1) 0%, rgb(0 0 255 / 1) 50%, rgb(255 255 0 / 1) 100%)"
    );
  });

  test("parses gradient with rgb colors", () => {
    const parsed = parseConicGradient(
      "conic-gradient(rgb(255, 0, 0), rgb(0, 255, 0), rgb(0, 0, 255))"
    );
    expect(parsed).toEqual(
      conic({
        angle: undefined,
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
              components: [0, 1, 0],
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
    expect(formatConicGradient(parsed!)).toBe(
      "conic-gradient(rgb(255 0 0 / 1), rgb(0 255 0 / 1), rgb(0 0 255 / 1))"
    );
  });

  test("returns undefined for invalid input", () => {
    expect(parseConicGradient("conic-gradient()")).toBeUndefined();
    expect(parseConicGradient("conic-gradient(var())")).toBeUndefined();
  });
});
