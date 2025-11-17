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
            color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
            position: { type: "unit", unit: "%", value: 0 },
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 },
            position: { type: "unit", unit: "%", value: 50 },
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 255, g: 255, b: 0, alpha: 1 },
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
            color: { type: "rgb", r: 255, g: 165, b: 0, alpha: 1 },
            position: { type: "unit", unit: "%", value: 0 },
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 0, g: 255, b: 255, alpha: 1 },
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
            color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
            position: { type: "unit", unit: "%", value: 0 },
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 },
            position: { type: "unit", unit: "%", value: 100 },
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
            color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
            position: { type: "unit", unit: "%", value: 0 },
            hint: { type: "unit", unit: "%", value: 25 },
          },
          {
            color: { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 },
            position: { type: "unit", unit: "%", value: 50 },
            hint: { type: "unit", unit: "%", value: 75 },
          },
        ],
      })
    );
    expect(formatConicGradient(parsed!)).toBe(
      "repeating-conic-gradient(rgba(255, 0, 0, 1) 0% 25%, rgba(0, 0, 255, 1) 50% 75%)"
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
            color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
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
            color: { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 },
            position: { type: "var", value: "end" },
            hint: undefined,
          },
        ],
      })
    );
    expect(formatConicGradient(parsed!)).toBe(
      "conic-gradient(rgba(255, 0, 0, 1) var(--start, 10%) var(--hint, 20%), rgba(0, 0, 255, 1) var(--end))"
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
            color: { type: "rgb", r: 0, g: 128, b: 0, alpha: 1 },
            position: { type: "unit", unit: "%", value: 0 },
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 },
            position: { type: "unit", unit: "%", value: 50 },
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 255, g: 255, b: 0, alpha: 1 },
            position: { type: "unit", unit: "%", value: 100 },
            hint: undefined,
          },
        ],
      })
    );
    expect(formatConicGradient(parsed!)).toBe(
      "conic-gradient(rgba(0, 128, 0, 1) 0%, rgba(0, 0, 255, 1) 50%, rgba(255, 255, 0, 1) 100%)"
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
            color: { type: "rgb", r: 255, g: 0, b: 0, alpha: 1 },
            position: undefined,
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 0, g: 255, b: 0, alpha: 1 },
            position: undefined,
            hint: undefined,
          },
          {
            color: { type: "rgb", r: 0, g: 0, b: 255, alpha: 1 },
            position: undefined,
            hint: undefined,
          },
        ],
      })
    );
    expect(formatConicGradient(parsed!)).toBe(
      "conic-gradient(rgba(255, 0, 0, 1), rgba(0, 255, 0, 1), rgba(0, 0, 255, 1))"
    );
  });

  test("returns undefined for invalid input", () => {
    expect(parseConicGradient("conic-gradient()")).toBeUndefined();
    expect(parseConicGradient("conic-gradient(var())")).toBeUndefined();
  });
});
