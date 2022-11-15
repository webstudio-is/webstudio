import * as React from "react";
import { IconProps } from "./types";

export const CrossLargeIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
        <path
          stroke={color}
          strokeLinecap="round"
          strokeWidth="1.6"
          d="M13 3 7.99998 8.00002m0 0L3 13m4.99998-4.99998L3 3.00008m4.99998 4.99994L13 13"
        />
      </svg>
    );
  }
);
CrossLargeIcon.displayName = "CrossLargeIcon";
