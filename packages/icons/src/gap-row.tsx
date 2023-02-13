import * as React from "react";
import type { IconProps } from "./types";

export const RowGapIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
        style={{ transform: "rotate(90deg)" }}
      >
        <path
          d="M14.4704 6H13.4407L13.4407 18L14.4704 18L14.4704 6Z"
          fill={color}
        />
        <path d="M14.4704 6H17.5593V7H14.4704L14.4704 6Z" fill={color} />
        <path
          d="M14.4704 17L17.5593 17V18L14.4704 18L14.4704 17Z"
          fill={color}
        />
        <path
          d="M6.44074 6L10.5296 6L10.5296 18L6.44073 18L6.44073 17L9.5 17L9.5 7L6.44074 7L6.44074 6Z"
          fill={color}
        />
      </svg>
    );
  }
);
RowGapIcon.displayName = "RowGapIcon";
