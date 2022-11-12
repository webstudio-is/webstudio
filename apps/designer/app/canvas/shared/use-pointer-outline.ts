import { useEffect, useRef } from "react";
import type { Point } from "@webstudio-is/design-system";

// Draw a point where we think the pointer is to visualize if calculations are based on the right position
// Only needed for debugging.
export const usePointerOutline = () => {
  const ref = useRef<HTMLDivElement>();

  useEffect(() => {
    const div = document.createElement("div");
    div.style.cssText = `
      position: absolute;
      width: 5px;
      height: 5px;
      background: red;
    `;
    document.body.appendChild(div);
    ref.current = div;
    return () => {
      document.body.removeChild(div);
    };
  }, []);

  return (offset: Point) => {
    if (ref.current === undefined) return;
    ref.current.style.left = `${offset.x}px`;
    ref.current.style.top = `${offset.y}px`;
  };
};
