import { test, expect, describe, beforeEach } from "vitest";
import { calcCanvasWidth, setCanvasWidth } from "./calc-canvas-width";
import { $workspaceRect, $canvasWidth } from "~/builder/shared/nano-states";
import { $breakpoints } from "~/shared/sync/data-stores";

// Helper to create a DOMRect-like object for testing
const createRect = (width: number, height: number): DOMRect => ({
  width,
  height,
  x: 0,
  y: 0,
  top: 0,
  right: width,
  bottom: height,
  left: 0,
  toJSON: () => ({
    width,
    height,
    x: 0,
    y: 0,
    top: 0,
    right: width,
    bottom: height,
    left: 0,
  }),
});

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

describe("custom condition breakpoints", () => {
  test("returns undefined for custom condition breakpoint", () => {
    const workspaceWidth = 1200;
    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Portrait", condition: "orientation:portrait" },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
      })
    ).toBeUndefined();
  });

  test("returns undefined for hover condition", () => {
    const workspaceWidth = 1200;
    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Hover", condition: "hover:hover" },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
      })
    ).toBeUndefined();
  });

  test("returns undefined for prefers-color-scheme", () => {
    const workspaceWidth = 1200;
    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Dark", condition: "prefers-color-scheme:dark" },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
      })
    ).toBeUndefined();
  });

  test("returns undefined regardless of custom canvasWidth for condition breakpoints", () => {
    const workspaceWidth = 1200;
    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Portrait", condition: "orientation:portrait" },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
        canvasWidth: 800, // Should be ignored
      })
    ).toBeUndefined();
  });

  test("base breakpoint ignores custom condition breakpoints when calculating width", () => {
    const workspaceWidth = 1200;
    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Tablet", minWidth: 768 },
      { id: "2", label: "Portrait", condition: "orientation:portrait" },
      { id: "3", label: "Hover", condition: "hover:hover" },
    ];
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(767); // minWidth - 1, ignoring condition breakpoints
  });

  test("handles mix of width-based and condition breakpoints", () => {
    const workspaceWidth = 1200;
    const breakpoints = [
      { id: "0", label: "Base" },
      { id: "1", label: "Tablet", minWidth: 768 },
      { id: "2", label: "Portrait", condition: "orientation:portrait" },
      { id: "3", label: "Desktop", minWidth: 1024 },
      { id: "4", label: "Hover", condition: "hover:hover" },
    ];

    // Width-based breakpoint works normally
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[1],
        workspaceWidth,
      })
    ).toStrictEqual(768);

    // Condition breakpoint returns undefined
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[2],
        workspaceWidth,
      })
    ).toBeUndefined();

    // Base calculates correctly ignoring condition breakpoints
    expect(
      calcCanvasWidth({
        breakpoints,
        selectedBreakpoint: breakpoints[0],
        workspaceWidth,
      })
    ).toStrictEqual(767);
  });
});

describe("setCanvasWidth", () => {
  beforeEach(() => {
    // Reset stores before each test
    $canvasWidth.set(0);
    $breakpoints.set(new Map());
    $workspaceRect.set(undefined);
  });

  test("returns false when workspaceRect is undefined", () => {
    const breakpoints = new Map([["0", { id: "0", label: "Base" }]]);
    $breakpoints.set(breakpoints);
    $workspaceRect.set(undefined);

    expect(setCanvasWidth("0")).toBe(false);
  });

  test("returns false when selectedBreakpoint is not found", () => {
    $workspaceRect.set(createRect(1000, 800));
    $breakpoints.set(new Map([["0", { id: "0", label: "Base" }]]));

    expect(setCanvasWidth("nonexistent")).toBe(false);
  });

  test("sets canvas width for base breakpoint", () => {
    const workspaceWidth = 1200;
    $workspaceRect.set(createRect(workspaceWidth, 800));
    $breakpoints.set(new Map([["0", { id: "0", label: "Base" }]]));

    const result = setCanvasWidth("0");

    expect(result).toBe(true);
    expect($canvasWidth.get()).toBe(workspaceWidth);
  });

  test("sets canvas width for max-width breakpoint", () => {
    $workspaceRect.set(createRect(1200, 800));
    $breakpoints.set(
      new Map([
        ["0", { id: "0", label: "Base" }],
        ["1", { id: "1", label: "Tablet", maxWidth: 991 }],
        ["2", { id: "2", label: "Mobile", maxWidth: 767 }],
      ])
    );

    const result = setCanvasWidth("1");

    expect(result).toBe(true);
    expect($canvasWidth.get()).toBe(768); // maxWidth of previous breakpoint + 1
  });

  test("sets canvas width for min-width breakpoint", () => {
    $workspaceRect.set(createRect(1000, 800));
    $breakpoints.set(
      new Map([
        ["0", { id: "0", label: "Base" }],
        ["1", { id: "1", label: "Large", minWidth: 1280 }],
      ])
    );

    const result = setCanvasWidth("1");

    expect(result).toBe(true);
    expect($canvasWidth.get()).toBe(1280);
  });

  test("updates canvas width when called multiple times", () => {
    $workspaceRect.set(createRect(1500, 800));
    $breakpoints.set(
      new Map([
        ["0", { id: "0", label: "Base" }],
        ["1", { id: "1", label: "Tablet", maxWidth: 991 }],
        ["2", { id: "2", label: "Mobile", maxWidth: 767 }],
      ])
    );

    setCanvasWidth("1");
    expect($canvasWidth.get()).toBe(768); // Previous breakpoint maxWidth (767) + 1

    setCanvasWidth("0");
    expect($canvasWidth.get()).toBe(1500);
  });

  test("returns undefined for custom condition breakpoint in setCanvasWidth", () => {
    $workspaceRect.set(createRect(1200, 800));
    $breakpoints.set(
      new Map([
        ["0", { id: "0", label: "Base" }],
        [
          "1",
          { id: "1", label: "Portrait", condition: "orientation:portrait" },
        ],
      ])
    );

    const result = setCanvasWidth("1");

    expect(result).toBe(true);
    expect($canvasWidth.get()).toBeUndefined(); // Undefined for condition breakpoints
  });

  test("returns undefined for hover condition breakpoint in setCanvasWidth", () => {
    $workspaceRect.set(createRect(1500, 800));
    $breakpoints.set(
      new Map([
        ["0", { id: "0", label: "Base" }],
        ["1", { id: "1", label: "Hover", condition: "hover:hover" }],
      ])
    );

    const result = setCanvasWidth("1");

    expect(result).toBe(true);
    expect($canvasWidth.get()).toBeUndefined();
  });
});

// Note: useSetCanvasWidth is a React hook with complex side effects (multiple store subscriptions
// and cleanup logic). It's primarily tested through integration tests and component tests rather
// than unit tests, as it orchestrates calls to setCanvasWidth which is fully unit tested above.
