import * as React from "react";
import type { IconProps } from "./types";

export const EllipsesIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        {...props}
        ref={forwardedRef}
      >
        <circle cx="2.5" cy="8" r="1.5" fill={color} />
        <circle cx="8" cy="8" r="1.5" fill={color} />
        <circle cx="13.5" cy="8" r="1.5" fill={color} />
      </svg>
    );
  }
);
EllipsesIcon.displayName = "EllipsesIcon";
