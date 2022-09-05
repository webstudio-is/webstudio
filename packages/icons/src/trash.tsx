import * as React from "react";
import { IconProps } from "./types";

export const TrashIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width={16}
        height={16}
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M3.556 5.222h8.889m-.556 0l-.482 6.746A1.111 1.111 0 0110.3 13H5.701a1.111 1.111 0 01-1.108-1.032L4.11 5.222h7.778zm-2.222 0V3.556A.556.556 0 009.11 3H6.89a.556.556 0 00-.556.556v1.666h3.334z"
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.889 7.405v3.333M9.11 7.405v3.333"
          stroke={color}
          strokeWidth={1.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

TrashIcon.displayName = "TrashIcon";
