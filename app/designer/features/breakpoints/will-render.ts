import { type Breakpoint } from "@webstudio-is/sdk";

export const willRender = (breakpoint: Breakpoint, canvasWidth: number) =>
  canvasWidth >= breakpoint.minWidth;
