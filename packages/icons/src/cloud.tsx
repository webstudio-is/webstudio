import * as React from "react";
import type { IconProps } from "./types";

export const CloudIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M3.433 11.4A2.333 2.333 0 014.57 7.473a2.918 2.918 0 115.705-1.222 2.917 2.917 0 11.058 5.832h-5.25a2.333 2.333 0 01-1.65-.683z"
          stroke={color}
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
);

CloudIcon.displayName = "CloudIcon";
