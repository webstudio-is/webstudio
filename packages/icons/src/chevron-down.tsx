import * as React from "react";
import type { IconProps } from "./types";

export const ChevronDownIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M4.04008 6.28383C4.29431 6.03037 4.70587 6.031 4.95932 6.28523L7.99985 9.33506L11.0404 6.28523C11.2938 6.031 11.7054 6.03037 11.9596 6.28383C12.2139 6.53728 12.2145 6.94884 11.961 7.20306L8.46017 10.7146C8.33822 10.837 8.17259 10.9057 7.99985 10.9057C7.82712 10.9057 7.66149 10.837 7.53953 10.7146L4.03868 7.20306C3.78523 6.94884 3.78585 6.53728 4.04008 6.28383Z"
          fill={color}
        />
      </svg>
    );
  }
);

ChevronDownIcon.displayName = "ChevronDownIcon";
