import { forwardRef } from "react";
import type { IconProps } from "./types";

export const TwitterIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "#fff", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={color}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill={color}
          d="M13.566 5.144c.007.123.009.248.009.371 0 3.797-2.89 8.173-8.172 8.173A8.124 8.124 0 0 1 1 12.398a5.765 5.765 0 0 0 4.252-1.188 2.875 2.875 0 0 1-2.683-1.996 2.936 2.936 0 0 0 1.297-.05 2.875 2.875 0 0 1-2.304-2.817v-.035c.388.215.831.344 1.301.36a2.872 2.872 0 0 1-.888-3.836 8.153 8.153 0 0 0 5.92 3.002 2.87 2.87 0 0 1 2.798-3.526c.826 0 1.572.347 2.097.906a5.785 5.785 0 0 0 1.824-.697A2.883 2.883 0 0 1 13.35 4.11 5.746 5.746 0 0 0 15 3.658a5.8 5.8 0 0 1-1.434 1.486Z"
        />
      </svg>
    );
  }
);

TwitterIcon.displayName = "TwitterIcon";
