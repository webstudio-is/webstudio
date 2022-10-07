import * as React from "react";
import { IconProps } from "./types";

export const OrderFirstIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
        <mask id="a" fill="#fff">
          <rect width="4" height="8" x="10.9" y="4" rx="1" />
        </mask>
        <rect
          width="4"
          height="8"
          x="10.9"
          y="4"
          stroke={color}
          strokeWidth="2.2"
          mask="url(#a)"
          rx="1"
        />
        <mask id="b" fill="#fff">
          <rect width="4" height="8" x="6.10022" y="4" rx="1" />
        </mask>
        <rect
          width="4"
          height="8"
          x="6.10022"
          y="4"
          stroke={color}
          strokeWidth="2.2"
          mask="url(#b)"
          rx="1"
        />
        <rect width="3.8" height="11" x="1.10022" y="2.5" fill={color} rx="1" />
      </svg>
    );
  }
);
OrderFirstIcon.displayName = "OrderFirstIcon";
