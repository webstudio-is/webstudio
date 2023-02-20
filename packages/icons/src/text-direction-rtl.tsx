import * as React from "react";
import type { IconProps } from "./types";

export const TextDirectionRTLIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M7.53033 3.46967C7.82322 3.76256 7.82322 4.23744 7.53033 4.53033L4.81066 7.25H13C13.4142 7.25 13.75 7.58579 13.75 8C13.75 8.41421 13.4142 8.75 13 8.75H4.81066L7.53033 11.4697C7.82322 11.7626 7.82322 12.2374 7.53033 12.5303C7.23744 12.8232 6.76256 12.8232 6.46967 12.5303L2.46967 8.53033C2.17678 8.23744 2.17678 7.76256 2.46967 7.46967L6.46967 3.46967C6.76256 3.17678 7.23744 3.17678 7.53033 3.46967Z"
          fill={color}
        />
      </svg>
    );
  }
);
TextDirectionRTLIcon.displayName = "TextDirectionRTLIcon";
