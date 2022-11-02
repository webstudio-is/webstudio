import * as React from "react";
import { IconProps } from "./types";

export const CrossIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          d="M13 3L7.99998 8.00002M7.99998 8.00002L3 13M7.99998 8.00002L3 3.00008M7.99998 8.00002L13 13"
          stroke={color}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
);

CrossIcon.displayName = "Cross";
