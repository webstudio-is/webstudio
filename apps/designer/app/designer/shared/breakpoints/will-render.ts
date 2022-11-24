import { type Breakpoint } from "@webstudio-is/css-data";

export const willRender = (breakpoint: Breakpoint, canvasWidth: number) =>
  canvasWidth >= breakpoint.minWidth;
