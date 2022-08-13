import * as React from "react";
import { IconProps } from "./types";

export const JustifyContentStart = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M10.9999 7.19999H8.79995V4.79999H7.19995V19.2H8.79995V16.8H10.9999V7.19999Z"
          fill={color}
        />
        <path d="M16.8 7.19999H13.6V16.8H16.8V7.19999Z" fill={color} />
      </svg>
    );
  }
);
JustifyContentStart.displayName = "JustifyContentStart";
