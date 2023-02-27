// Generated from icons/drag-handle.svg

import { forwardRef } from "react";
import type { IconProps } from "../types";

// prettier-ignore
export const DragHandleIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", size = 16, ...props }, forwardedRef) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width={size} height={size} fill={color} {...props} ref={forwardedRef}><rect width="6" height="1" x="5" y="3" rx=".5" /><rect width="6" height="1" x="5" y="6" rx=".5" /><rect width="6" height="1" x="5" y="9" rx=".5" /><rect width="6" height="1" x="5" y="12" rx=".5" /></svg>
    );
  }
);

DragHandleIcon.displayName = "DragHandleIcon";
