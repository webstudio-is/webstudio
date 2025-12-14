import type { Rect } from "@webstudio-is/design-system";

export const applyScale = (rect: Rect, scale: number = 1) => {
  // Calculate in the "scale" that is applied to the canvas
  const scaleFactor = scale / 100;
  return {
    top: Math.round(rect.top * scaleFactor),
    left: Math.round(rect.left * scaleFactor),
    width: Math.round(rect.width * scaleFactor),
    height: Math.round(rect.height * scaleFactor),
  };
};
