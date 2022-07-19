import { type Breakpoint } from "@webstudio-is/react-sdk";

export const willRender = (breakpoint: Breakpoint, canvasWidth: number) =>
  canvasWidth >= breakpoint.minWidth;
