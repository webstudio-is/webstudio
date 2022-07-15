import type { Instance } from "@webstudio-is/sdk";

export type Coordinate = { x: number; y: number };

export type DragOverMeta = {
  element: HTMLElement;
  edge: "top" | "bottom" | "none";
  instance: Instance;
};

export type ClosestChildMeta = {
  relativePosition: "before" | "after" | "inside";
  element: Element;
};
