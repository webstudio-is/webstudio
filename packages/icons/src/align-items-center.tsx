import * as React from "react";
import type { IconProps } from "./types";

export const AlignItemsCenterIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M10.4 11H12.8V5L15 5V11H20V12.6H15V19H12.8V12.6H10.4V17H8.2V12.6H4V11H8.2V7H10.4V11Z"
          fill={color}
        />
      </svg>
    );
  }
);
AlignItemsCenterIcon.displayName = "AlignItemsCenterIcon";
