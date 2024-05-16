import { test, expect, describe } from "@jest/globals";
import { calcCanvasWidth } from "./calc-canvas-width";

const breakpoints = [
  { id: "0", label: "Base" },
  { id: "1", label: "Tablet", maxWidth: 991 },
  { id: "2", label: "Mobile landscape", maxWidth: 767 },
  { id: "3", label: "Mobile portrait", maxWidth: 479 },
  { id: "4", label: "Large", minWidth: 1280 },
  { id: "5", label: "Extra Large", minWidth: 1440 },
];

describe("base breakpoint", () => {
  test("without canvas width", () => {
    const workspaceWidth = 1000;
    const breakpoints = [{ id: "0", label: "Base" }];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(workspaceWidth);
  });

  test("canvas width bigger than workspace", () => {
    const workspaceWidth = 1000;
    const breakpoints = [{ id: "0", label: "Base" }];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
        canvasWidth: 1200,
      })
    ).toStrictEqual(workspaceWidth);
  });

  test("canvas width smaller than workspace", () => {
    const workspaceWidth = 1000;
    const breakpoints = [{ id: "0", label: "Base" }];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
        canvasWidth: 900,
      })
    ).toStrictEqual(workspaceWidth);
  });

  test("keep current canvas width when there is min-width breakpoint", () => {
    const workspaceWidth = 1200;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
        canvasWidth: 1000,
      })
    ).toStrictEqual(1000);
  });

  test("keep a custom canvas width when there is no min-width breakpoint", () => {
    const workspaceWidth = 1000;
    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Tablet", maxWidth: 991 },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
        canvasWidth: 993,
      })
    ).toStrictEqual(993);
  });

  test("using maximum available workspace while not entering any of the breakpoints", () => {
    const workspaceWidth = 1000;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(workspaceWidth);
  });

  test("workspace is smaller than the base breakpoint range, so we need to use minimum available", () => {
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth: 500,
      })
    ).toStrictEqual(992);
  });

  test("min-width only", () => {
    const workspaceWidth = 1000;

    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "4", label: "Large", minWidth: 1280 },
      { id: "5", label: "Extra Large", minWidth: 1440 },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(workspaceWidth);
  });

  test("max-width only", () => {
    const workspaceWidth = 1000;

    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Tablet", maxWidth: 991 },
      { id: "2", label: "Mobile landscape", maxWidth: 767 },
      { id: "3", label: "Mobile portrait", maxWidth: 479 },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(workspaceWidth);
  });
});

describe("other breakpoints", () => {
  test("tablet", () => {
    const workspaceWidth = 1000;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
      })
    ).toStrictEqual(768);
  });

  test("tablet - keep the custom width", () => {
    const workspaceWidth = 1000;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
        canvasWidth: 993,
      })
    ).toStrictEqual(993);
  });

  test("mobile landscape", () => {
    const workspaceWidth = 1000;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[2],
        workspaceWidth,
      })
    ).toStrictEqual(480);
  });

  test("mobile portrait", () => {
    const workspaceWidth = 1000;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[3],
        workspaceWidth,
      })
    ).toStrictEqual(320);
  });

  test("large", () => {
    const workspaceWidth = 1000;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[4],
        workspaceWidth,
      })
    ).toStrictEqual(1280);
  });

  test("extra large", () => {
    const workspaceWidth = 1000;
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[5],
        workspaceWidth,
      })
    ).toStrictEqual(1440);
  });

  test("0 min-width", () => {
    const workspaceWidth = 1000;
    const breakpoints = [{ id: "0", label: "x", minWidth: 0 }];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(320);
  });

  test("low min-width", () => {
    const workspaceWidth = 1000;
    const breakpoints = [{ id: "0", label: "x", minWidth: 123 }];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(123);
  });

  test("no previous max-width", () => {
    const workspaceWidth = 1000;
    const breakpoints = [{ id: "0", label: "x", maxWidth: 100 }];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(320);
  });
});
