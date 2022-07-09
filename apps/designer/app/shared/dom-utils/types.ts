export type Coordinate = { x: number; y: number };
export type DragOverInfo = {
  element: HTMLElement | undefined;
  edge: "top" | "bottom" | "none";
};
export type ClosestChildInfo = {
  relativePosition: "before" | "after" | "inside";
  element: Element;
};
