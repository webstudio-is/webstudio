import { useCallback, useState } from "react";
import type { Rect } from "@webstudio-is/design-system";

export type OutlineControlPosition = "top" | "inside" | "bottom";

// Prefer placing controls outside the instance. For tall instances, keep the
// control visible inside the outline instead of moving it far below the fold.
export const getOutlineControlPosition = ({
  controlHeight,
  instanceRect,
}: {
  controlHeight: number;
  instanceRect: Rect;
}): OutlineControlPosition => {
  if (controlHeight <= instanceRect.top) {
    return "top";
  }
  return instanceRect.height < 250 ? "bottom" : "inside";
};

type ControlRefCallback = (element: HTMLElement | null) => void;

export const useOutlineControlPosition = (
  instanceRect: Rect | undefined
): [ControlRefCallback, OutlineControlPosition] => {
  const [position, setPosition] = useState<OutlineControlPosition>("top");
  const ref = useCallback(
    (element: HTMLElement | null) => {
      if (element === null || instanceRect === undefined) {
        return;
      }
      setPosition(
        getOutlineControlPosition({
          controlHeight: element.getBoundingClientRect().height,
          instanceRect,
        })
      );
    },
    [instanceRect]
  );
  return [ref, position];
};
