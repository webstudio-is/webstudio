import {
  type Rect,
  type ChildrenOrientation,
  getRectsOrientation,
} from "./geometry-utils";

export type UsableElement = HTMLElement | SVGElement;

// Many DOM APIs produce values of type Element,
// which lacks certain methods that we often need.
// It's also usually safe to assume that the value is in fact HTMLElement or SVGElement.
// We use this helper to convince TypeScript that the value is a UsableElement.
export const toUseableElement = (
  element: EventTarget | Element | undefined | null
): UsableElement | undefined => {
  if (element instanceof HTMLElement || element instanceof SVGElement) {
    return element;
  }
};

// By looking at a specific child and it's neighbours,
// determines their orientation relative to each other
export const getLocalChildrenOrientation = (
  parent: UsableElement,
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
      type: probeRect.width === 0 ? "horizontal" : "vertical",
      reverse: false,
    };
  }

  return getRectsOrientation(previous, current, next);
};

export const getChildrenRects = (parent: UsableElement) => {
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
