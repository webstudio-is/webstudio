import * as React from "react";
import { IconProps } from "./types";

export const ChevronLeftIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M9.7162 4.04011C9.96966 4.29434 9.96903 4.7059 9.7148 4.95935L6.66497 7.99988L9.7148 11.0404C9.96903 11.2939 9.96966 11.7054 9.7162 11.9597C9.46275 12.2139 9.05119 12.2145 8.79697 11.9611L5.28541 8.4602C5.16308 8.33825 5.09432 8.17262 5.09432 7.99988C5.09432 7.82715 5.16308 7.66152 5.28541 7.53956L8.79697 4.03871C9.05119 3.78526 9.46275 3.78588 9.7162 4.04011Z"
          fill={color}
        />
      </svg>
    );
  }
);

ChevronLeftIcon.displayName = "ChevronLeftIcon";
