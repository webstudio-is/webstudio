import type { Breakpoint } from "@webstudio-is/project-build";

export const willRender = (breakpoint: Breakpoint, canvasWidth: number) => {
  const minWidth = breakpoint.minWidth ?? 0;
  const maxWidth = breakpoint.maxWidth ?? Number.MAX_SAFE_INTEGER;
  return canvasWidth >= minWidth && canvasWidth <= maxWidth;
};
