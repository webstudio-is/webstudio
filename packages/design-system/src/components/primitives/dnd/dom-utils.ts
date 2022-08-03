import {
  type Rect,
  type ChildrenOrientation,
  getRectsOrientation,
} from "./geometry-utils";

// By looking at a specific child and it's neighbours,
// determines their orientation relative to each other
export const getLocalChildrenOrientation = (
  parent: Element,
  childrentRects: Rect[],
  childIndex: number
): ChildrenOrientation => {
  const previous = childrentRects[childIndex - 1] as Rect | undefined;
  const current = childrentRects[childIndex] as Rect | undefined;
  const next = childrentRects[childIndex + 1] as Rect | undefined;

  if (current === undefined || (next === undefined && previous === undefined)) {
    const probe = document.createElement("div");
    const { children } = parent;
    if (childIndex > children.length - 1) {
      parent.appendChild(probe);
    } else {
      parent.insertBefore(probe, children[childIndex]);
    }
    const probeRect = probe.getBoundingClientRect();
    parent.removeChild(probe);

    return {
      type:
        probeRect.width === 0 && probeRect.height > 0
          ? "horizontal"
          : "vertical",
      reverse: false,
    };
  }

  return getRectsOrientation(previous, current, next);
};

export const getChildrenRects = (parent: Element) => {
  const parentRect = parent.getBoundingClientRect();

  // We convert to relative coordinates to be able to store the result in cache.
  // Otherwise we would have to clear cache on scroll etc.
  const toRelativeCoordinates = (rect: Rect) => ({
    left: rect.left - parentRect.left,
    top: rect.top - parentRect.top,
    width: rect.width,
    height: rect.height,
  });

  return Array.from(parent.children).map((child) =>
    toRelativeCoordinates(child.getBoundingClientRect())
  );
};
