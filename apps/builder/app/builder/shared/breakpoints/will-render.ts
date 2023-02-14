import type { Breakpoint } from "@webstudio-is/project-build";

export const willRender = (breakpoint: Breakpoint, canvasWidth: number) =>
  canvasWidth >= breakpoint.minWidth;
