import type { Instance } from "@webstudio-is/project-build";
import { idAttribute, selectorIdAttribute } from "@webstudio-is/react-sdk";
import type { InstanceSelector } from "./tree-utils";

export const getInstanceIdFromElement = (
  element: Element
): Instance["id"] | undefined => {
  return element.getAttribute(idAttribute) ?? undefined;
};

// traverse dom to the root and find all instances
export const getInstanceSelectorFromElement = (element: Element) => {
  // Change logic to support Portals
  const matched: undefined | Element =
    element.closest(`[${idAttribute}]`) ?? undefined;

  const instanceSelector: InstanceSelector =
    matched?.getAttribute(selectorIdAttribute)?.split(",") ?? [];

  if (instanceSelector.length === 0) {
    return;
  }
  return instanceSelector;
};

export const getElementByInstanceSelector = (
  instanceSelector: InstanceSelector | Readonly<InstanceSelector>
) => {
  return (
    document.querySelector<HTMLElement>(
      `[${selectorIdAttribute}="${instanceSelector.join(",")}"]`
    ) ?? undefined
  );
};

type Rect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const sumRects = (first: Rect, second: Rect) => {
  return {
    top: Math.min(first.top, second.top),
    right: Math.max(first.right, second.right),
    bottom: Math.max(first.bottom, second.bottom),
    left: Math.min(first.left, second.left),
  };
};

export const getAllElementsBoundingBox = (element: Element): DOMRect => {
  const rect = element.getBoundingClientRect();
  if (element.children.length === 0) {
    return rect;
  }
  // possible display: contents
  if (rect.width !== 0 || rect.height !== 0) {
    return rect;
  }

  const rects: Rect[] = [];

  for (const child of element.children) {
    const childRect = getAllElementsBoundingBox(child);
    // possible display: contents
    if (childRect.width !== 0 || childRect.height !== 0) {
      const { top, right, bottom, left } = childRect;
      rects.push({ top, right, bottom, left });
    }
  }

  if (rects.length === 0) {
    return rect;
  }

  const { top, right, bottom, left } = rects.reduce(sumRects);
  return DOMRect.fromRect({
    x: left,
    y: top,
    height: bottom - top,
    width: right - left,
  });
};
