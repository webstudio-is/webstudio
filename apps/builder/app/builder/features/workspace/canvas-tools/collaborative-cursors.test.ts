import { describe, expect, test } from "vitest";
import { __testing__ } from "./collaborative-cursors";

const {
  getCollaboratorLabel,
  computePredictedCursor,
  shouldSkipCollaborator,
  hasCursorPosition,
  computeCursorCoordinates,
  isWithinLayer,
  toRenderableCollaboratorCursor,
} = __testing__;

describe("collaborative-cursors helpers", () => {
  test("getCollaboratorLabel trims names and skips empty labels", () => {
    expect(getCollaboratorLabel({ name: " Ada " })).toBe("Ada");
    expect(getCollaboratorLabel({ name: " " })).toBeUndefined();
    expect(getCollaboratorLabel({})).toBeUndefined();
  });

  test("shouldSkipCollaborator returns true only for different known pages", () => {
    expect(
      shouldSkipCollaborator({
        currentPageId: "page-a",
        collaboratorPageId: "page-b",
      })
    ).toBe(true);

    expect(
      shouldSkipCollaborator({
        currentPageId: "page-a",
        collaboratorPageId: "page-a",
      })
    ).toBe(false);

    expect(
      shouldSkipCollaborator({
        currentPageId: "page-a",
        collaboratorPageId: undefined,
      })
    ).toBe(false);
  });

  test("hasCursorPosition returns true when pointer position is set", () => {
    expect(hasCursorPosition(undefined)).toBe(false);
    expect(hasCursorPosition({ x: 10, y: 20, xRatio: 0.1, yRatio: 0.2 })).toBe(
      true
    );
  });

  test("computeCursorCoordinates maps normalized coordinates using canvas rect", () => {
    const layerRect = { left: 0, top: 0, width: 1200, height: 800 };
    const canvasRect = { left: 100, top: 200, width: 800, height: 600 };

    const result = computeCursorCoordinates({
      pointerPosition: { x: 0, y: 0, xRatio: 0.5, yRatio: 0.25 },
      layerRect,
      canvasRect,
    });

    expect(result).toEqual({ x: 500, y: 350 });
  });

  test("computeCursorCoordinates falls back to layer rect when canvas rect is missing", () => {
    const layerRect = { left: 0, top: 0, width: 1000, height: 800 };

    const result = computeCursorCoordinates({
      pointerPosition: { x: 0, y: 0, xRatio: 0.5, yRatio: 0.25 },
      layerRect,
      canvasRect: undefined,
    });

    expect(result).toEqual({ x: 500, y: 200 });
  });

  test("computeCursorCoordinates uses ratios against layer rect when canvas rect is missing", () => {
    const layerRect = { left: 50, top: 100, width: 1000, height: 800 };

    const result = computeCursorCoordinates({
      pointerPosition: { x: 350, y: 500, xRatio: 0.3, yRatio: 0.5 },
      layerRect,
      canvasRect: undefined,
    });

    expect(result).toEqual({ x: 300, y: 400 });
  });

  test("isWithinLayer bounds-checks computed coordinates", () => {
    const layerRect = { left: 0, top: 0, width: 500, height: 400 };

    expect(isWithinLayer({ x: 10, y: 10, layerRect })).toBe(true);
    expect(isWithinLayer({ x: -1, y: 10, layerRect })).toBe(false);
    expect(isWithinLayer({ x: 10, y: 401, layerRect })).toBe(false);
    expect(isWithinLayer({ x: 999, y: 999, layerRect: undefined })).toBe(true);
  });

  test("computePredictedCursor extrapolates from cursor velocity", () => {
    expect(
      computePredictedCursor({
        current: { x: 20, y: 30, time: 100 },
        previous: { x: 10, y: 10, time: 0 },
        layerRect: { left: 0, top: 0, width: 500, height: 400 },
      }).coordinates
    ).toEqual({ x: 28, y: 46 });
  });

  test("computePredictedCursor smooths velocity across updates", () => {
    const prediction = computePredictedCursor({
      current: { x: 20, y: 0, time: 100 },
      previous: { x: 10, y: 0, time: 0, velocity: { x: 0.3, y: 0 } },
      layerRect: { left: 0, top: 0, width: 500, height: 400 },
    });

    expect(prediction.coordinates.x).toBe(36);
    expect(prediction.velocity.x).toBe(0.2);
  });

  test("computePredictedCursor resets velocity when direction reverses", () => {
    const prediction = computePredictedCursor({
      current: { x: 90, y: 0, time: 100 },
      previous: { x: 100, y: 0, time: 0, velocity: { x: 0.5, y: 0 } },
      layerRect: { left: 0, top: 0, width: 500, height: 400 },
    });

    expect(prediction.coordinates.x).toBe(82);
    expect(prediction.velocity.x).toBe(-0.1);
  });

  test("computePredictedCursor skips stale samples", () => {
    expect(
      computePredictedCursor({
        current: { x: 20, y: 30, time: 500 },
        previous: { x: 10, y: 10, time: 0 },
        layerRect: { left: 0, top: 0, width: 500, height: 400 },
      }).coordinates
    ).toEqual({ x: 20, y: 30 });
  });

  test("computePredictedCursor stops predicting when the cursor stops", () => {
    const prediction = computePredictedCursor({
      current: { x: 20, y: 30, time: 100 },
      previous: { x: 20, y: 30, time: 0, velocity: { x: 0.5, y: 0 } },
      layerRect: { left: 0, top: 0, width: 500, height: 400 },
    });

    expect(prediction.coordinates).toEqual({ x: 20, y: 30 });
    expect(prediction.velocity).toEqual({ x: 0, y: 0 });
  });

  test("computePredictedCursor caps prediction distance", () => {
    const result = computePredictedCursor({
      current: { x: 200, y: 0, time: 10 },
      previous: { x: 0, y: 0, time: 0 },
      layerRect: { left: 0, top: 0, width: 500, height: 400 },
    }).coordinates;

    expect(result.x).toBe(280);
    expect(result.y).toBe(0);
  });

  test("computePredictedCursor clamps prediction to layer", () => {
    expect(
      computePredictedCursor({
        current: { x: 490, y: 390, time: 100 },
        previous: { x: 450, y: 350, time: 0 },
        layerRect: { left: 0, top: 0, width: 500, height: 400 },
      }).coordinates
    ).toEqual({ x: 500, y: 400 });
  });

  test("toRenderableCollaboratorCursor returns coordinates only for visible collaborator cursor", () => {
    const layerRect = { left: 0, top: 0, width: 1200, height: 800 };
    const canvasRect = { left: 100, top: 200, width: 800, height: 600 };

    expect(
      toRenderableCollaboratorCursor({
        currentPageId: "page-a",
        collaboratorPageId: "page-b",
        pointerPosition: { x: 10, y: 20, xRatio: 0, yRatio: 0 },
        layerRect,
        canvasRect,
      })
    ).toBeUndefined();

    expect(
      toRenderableCollaboratorCursor({
        currentPageId: "page-a",
        collaboratorPageId: "page-a",
        pointerPosition: undefined,
        layerRect,
        canvasRect,
      })
    ).toBeUndefined();

    expect(
      toRenderableCollaboratorCursor({
        currentPageId: "page-a",
        collaboratorPageId: "page-a",
        pointerPosition: { x: 0, y: 0, xRatio: 0.5, yRatio: 0.25 },
        layerRect,
        canvasRect,
      })
    ).toEqual({ x: 500, y: 350 });
  });

  test("toRenderableCollaboratorCursor recalculates position when receiver canvas changes", () => {
    const layerRect = { left: 0, top: 0, width: 1400, height: 1000 };
    const normalized = { xRatio: 0.25, yRatio: 0.75 };

    const firstReceiverCanvasRect = {
      left: 100,
      top: 100,
      width: 800,
      height: 600,
    };
    const secondReceiverCanvasRect = {
      left: 200,
      top: 150,
      width: 1200,
      height: 900,
    };

    const firstRender = toRenderableCollaboratorCursor({
      currentPageId: "page-a",
      collaboratorPageId: "page-a",
      pointerPosition: { x: 0, y: 0, ...normalized },
      layerRect,
      canvasRect: firstReceiverCanvasRect,
    });

    const secondRender = toRenderableCollaboratorCursor({
      currentPageId: "page-a",
      collaboratorPageId: "page-a",
      pointerPosition: { x: 0, y: 0, ...normalized },
      layerRect,
      canvasRect: secondReceiverCanvasRect,
    });

    expect(firstRender).toEqual({ x: 300, y: 550 });
    expect(secondRender).toEqual({ x: 500, y: 825 });
  });
});
