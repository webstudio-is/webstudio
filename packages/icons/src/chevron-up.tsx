import * as React from "react";
import type { IconProps } from "./types";

export const ChevronUpIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.9599 9.71617C11.7057 9.96963 11.2941 9.969 11.0407 9.71477L8.00015 6.66494L4.95962 9.71477C4.70616 9.969 4.29461 9.96963 4.04038 9.71617C3.78615 9.46272 3.78552 9.05116 4.03897 8.79694L7.53983 5.28538C7.66178 5.16305 7.82741 5.09429 8.00015 5.09429C8.17288 5.09429 8.33851 5.16305 8.46047 5.28538L11.9613 8.79694C12.2148 9.05116 12.2141 9.46272 11.9599 9.71617Z"
          fill={color}
        />
      </svg>
    );
  }
);

ChevronUpIcon.displayName = "ChevronUpIcon";
