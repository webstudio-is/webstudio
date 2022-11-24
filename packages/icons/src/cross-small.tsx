import * as React from "react";
import { IconProps } from "./types";

export const CrossSmallIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          strokeWidth="1.4"
          d="M11 5 7.99999 8.00001m0 0L5 11m2.99999-2.99999L5 5.00005m2.99999 2.99996L11 11"
        />
      </svg>
    );
  }
);
CrossSmallIcon.displayName = "CrossSmallIcon";
