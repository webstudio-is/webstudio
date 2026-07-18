import type { Point } from "@webstudio-is/design-system";

export const toCanvasCoordinates = (
  { x, y }: Point,
  scale: number,
  canvasRect?: DOMRect
) => {
  if (canvasRect === undefined) {
    return { x: 0, y: 0 };
  }
  const scaleFraction = scale / 100;
  return {
    x: (x - canvasRect.x) / scaleFraction,
    y: (y - canvasRect.y) / scaleFraction,
  };
};
