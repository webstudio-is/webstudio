import * as React from "react";
import type { IconProps } from "./types";

export const AlignContentStartIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path d="M4 6H20V7H4V6Z" fill={color} />
        <path d="M8 9H11V12H8V9Z" fill={color} />
        <path d="M16 9H13V12H16V9Z" fill={color} />
        <path d="M13 14H16V17H13V14Z" fill={color} />
        <path d="M11 14H8V17H11V14Z" fill={color} />
      </svg>
    );
  }
);
AlignContentStartIcon.displayName = "AlignContentStartIcon";
