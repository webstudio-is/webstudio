export type Coordinate = { x: number; y: number };
export type DragOverInfo = {
  element: Element | undefined;
  edge: "top" | "bottom" | "none";
};
export type ClosestChildInfo = {
  relativePosition: "before" | "after" | "inside";
  element: Element;
};
