import * as React from "react";
import type { IconProps } from "./types";

export const FlexWrapNowrapIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M13 9H11V15H13V9ZM19 9H17V15H19V9ZM7 9H5V15H7V9ZM4 8V16H8V8H4ZM14 8V16H10V8H14ZM20 8V16H16V8H20Z"
          fill={color}
        />
      </svg>
    );
  }
);
FlexWrapNowrapIcon.displayName = "FlexWrapNowrapIcon";
