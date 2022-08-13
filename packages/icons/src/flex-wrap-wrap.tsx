import * as React from "react";
import { IconProps } from "./types";

export const FlexWrapWrapIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
        <path d="M16 13H20V20H16V13Z" fill={color} />
        <path d="M4 13H8V20H4V13Z" fill={color} />
        <path d="M10 13H14V20H10V13Z" fill={color} />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13 5H11V10H13V5ZM19 5H17V10H19V5ZM7 5H5V10H7V5ZM19 14H17V19H19V14ZM7 14H5V19H7V14ZM13 14H11V19H13V14ZM8 4V11H4V4H8ZM10 4V11H14V4H10ZM16 4V11H20V4H16ZM16 13V20H20V13H16ZM8 13V20H4V13H8ZM10 13V20H14V13H10Z"
          fill={color}
        />
      </svg>
    );
  }
);
FlexWrapWrapIcon.displayName = "FlexWrapWrapIcon";
