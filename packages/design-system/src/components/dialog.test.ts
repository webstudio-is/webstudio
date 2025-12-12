import { describe, test, expect } from "vitest";
import { __testing__ } from "./dialog";

const {
  calculateInset,
  calculateCenteredPosition,
  calculateDialogStyle,
  applyBoundaries,
} = __testing__;

describe("calculateInset", () => {
  test("calculates inset for centered boundary", () => {
    const bounds = { x: 100, y: 50, width: 800, height: 600 };
    const result = calculateInset(bounds, 1920, 1080);
    expect(result).toBe("50px 1020px 430px 100px");
  });

  test("calculates inset for full viewport", () => {
    const bounds = { x: 0, y: 0, width: 1920, height: 1080 };
    const result = calculateInset(bounds, 1920, 1080);
    expect(result).toBe("0px 0px 0px 0px");
  });

  test("calculates inset for small boundary", () => {
    const bounds = { x: 500, y: 300, width: 400, height: 300 };
    const result = calculateInset(bounds, 1920, 1080);
    expect(result).toBe("300px 1020px 480px 500px");
  });
});

describe("calculateCenteredPosition", () => {
  test("centers dialog in boundary", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const result = calculateCenteredPosition(bounds, 400, 300);
    expect(result).toEqual({ top: 250, left: 300 });
  });

  test("centers dialog with offset boundary", () => {
    const bounds = { x: 100, y: 50, width: 800, height: 600 };
    const result = calculateCenteredPosition(bounds, 400, 300);
    expect(result).toEqual({ top: 200, left: 300 });
  });

  test("handles dialog larger than boundary", () => {
    const bounds = { x: 0, y: 0, width: 200, height: 150 };
    const result = calculateCenteredPosition(bounds, 400, 300);
    // Should clamp to bounds.y/x (0, 0) when dialog is too large
    expect(result).toEqual({ top: 0, left: 0 });
  });

  test("handles undefined dimensions", () => {
    const bounds = { x: 100, y: 50, width: 800, height: 600 };
    const result = calculateCenteredPosition(bounds);
    expect(result).toEqual({ top: 350, left: 500 });
  });
});

describe("calculateDialogStyle", () => {
  test("maximized dialog fills boundary", () => {
    const bounds = { x: 100, y: 50, width: 800, height: 600 };
    const style = calculateDialogStyle(bounds, {
      isMaximized: true,
      windowWidth: 1920,
      windowHeight: 1080,
    });

    expect(style).toEqual({
      top: 50,
      left: 100,
      width: 800,
      height: 600,
    });
  });

  test("dialog with both width and height uses centered positioning", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const style = calculateDialogStyle(bounds, {
      isMaximized: false,
      width: 400,
      height: 300,
      windowWidth: 1920,
      windowHeight: 1080,
    });

    expect(style).toMatchObject({
      top: 250,
      left: 300,
      width: 400,
      height: 300,
    });
  });

  test("dialog with only width uses inset centering", () => {
    const bounds = { x: 100, y: 50, width: 800, height: 600 };
    const style = calculateDialogStyle(bounds, {
      isMaximized: false,
      width: 400,
      windowWidth: 1920,
      windowHeight: 1080,
    });

    expect(style).toMatchObject({
      inset: "50px 1020px 430px 100px",
      margin: "auto",
      width: 400,
      maxWidth: 800,
      maxHeight: 600,
    });
  });

  test("dialog with no dimensions uses inset centering", () => {
    const bounds = { x: 100, y: 50, width: 800, height: 600 };
    const style = calculateDialogStyle(bounds, {
      isMaximized: false,
      windowWidth: 1920,
      windowHeight: 1080,
    });

    expect(style).toMatchObject({
      inset: "50px 1020px 430px 100px",
      margin: "auto",
      maxWidth: 800,
      maxHeight: 600,
    });
  });

  test("applies minWidth and minHeight", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const style = calculateDialogStyle(bounds, {
      isMaximized: false,
      width: 400,
      height: 300,
      minWidth: 200,
      minHeight: 150,
      windowWidth: 1920,
      windowHeight: 1080,
    });

    expect(style.minWidth).toBe(200);
    expect(style.minHeight).toBe(150);
  });

  test("handles edge case: zero-sized boundary", () => {
    const bounds = { x: 0, y: 0, width: 0, height: 0 };
    const style = calculateDialogStyle(bounds, {
      isMaximized: false,
      width: 400,
      height: 300,
      windowWidth: 1920,
      windowHeight: 1080,
    });

    expect(style).toMatchObject({
      top: 0,
      left: 0,
      width: 400,
      height: 300,
    });
  });
});

describe("applyBoundaries", () => {
  test("constrains dialog within bounds", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const result = applyBoundaries(100, 50, 400, 300, bounds);

    expect(result).toEqual({
      x: 100,
      y: 50,
      width: 400,
      height: 300,
    });
  });

  test("constrains dialog that exceeds right boundary", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const result = applyBoundaries(800, 50, 400, 300, bounds);

    expect(result).toEqual({
      x: 600, // 1000 - 400
      y: 50,
      width: 400,
      height: 300,
    });
  });

  test("constrains dialog that exceeds bottom boundary", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const result = applyBoundaries(100, 700, 400, 300, bounds);

    expect(result).toEqual({
      x: 100,
      y: 500, // 800 - 300
      width: 400,
      height: 300,
    });
  });

  test("constrains dialog with negative position", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const result = applyBoundaries(-50, -20, 400, 300, bounds);

    expect(result).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
  });

  test("constrains dialog larger than bounds", () => {
    const bounds = { x: 0, y: 0, width: 500, height: 400 };
    const result = applyBoundaries(0, 0, 800, 600, bounds);

    expect(result).toEqual({
      x: 0,
      y: 0,
      width: 500, // Constrained to bounds width
      height: 400, // Constrained to bounds height
    });
  });

  test("applies horizontal tolerance", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const tolerance = { horizontal: 50 };
    const result = applyBoundaries(-60, 50, 400, 300, bounds, tolerance);

    expect(result).toEqual({
      x: -50, // Allowed to go 50px outside on left
      y: 50,
      width: 400,
      height: 300,
    });
  });

  test("applies vertical tolerance", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const tolerance = { vertical: 30 };
    const result = applyBoundaries(100, -40, 400, 300, bounds, tolerance);

    expect(result).toEqual({
      x: 100,
      y: -30, // Allowed to go 30px outside on top
      width: 400,
      height: 300,
    });
  });

  test("applies both horizontal and vertical tolerance", () => {
    const bounds = { x: 0, y: 0, width: 1000, height: 800 };
    const tolerance = { horizontal: 50, vertical: 30 };
    const result = applyBoundaries(1100, 900, 400, 300, bounds, tolerance);

    expect(result).toEqual({
      x: 650, // 1000 + 50 - 400
      y: 530, // 800 + 30 - 300
      width: 400,
      height: 300,
    });
  });

  test("handles offset boundary with tolerance", () => {
    const bounds = { x: 100, y: 50, width: 800, height: 600 };
    const tolerance = { horizontal: 20, vertical: 10 };
    const result = applyBoundaries(90, 45, 400, 300, bounds, tolerance);

    expect(result).toEqual({
      x: 90, // Within tolerance (100 - 20 = 80)
      y: 45, // Within tolerance (50 - 10 = 40)
      width: 400,
      height: 300,
    });
  });

  test("increases allowed size with tolerance", () => {
    const bounds = { x: 0, y: 0, width: 500, height: 400 };
    const tolerance = { horizontal: 100, vertical: 50 };
    const result = applyBoundaries(0, 0, 800, 600, bounds, tolerance);

    expect(result).toEqual({
      x: -100, // Can go 100px outside on left
      y: -50, // Can go 50px outside on top
      width: 700, // 500 + 100*2
      height: 500, // 400 + 50*2
    });
  });
});
