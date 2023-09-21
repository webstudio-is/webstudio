import type { Rect } from "@webstudio-is/design-system";

export const applyScale = (rect: Rect, scale: number = 1) => {
  // Calculate in the "scale" that is applied to the canvas
  const scaleFactor = scale / 100;
  return {
    top: rect.top * scaleFactor,
    left: rect.left * scaleFactor,
    width: rect.width * scaleFactor,
    height: rect.height * scaleFactor,
  };
};
