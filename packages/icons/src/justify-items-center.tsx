import * as React from "react";
import { IconProps } from "./types";

// @todo this is just a copy of justifyContent icons for now
export const JustifyItemsCenter = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12.7999 4.79999V19.2H11.1999V4.79999H12.7999ZM16.5999 15.8H14.3999V8.19999H16.5999V15.8ZM7.3999 15.8H9.5999V8.19999H7.3999V15.8Z"
          fill={color}
        />
      </svg>
    );
  }
);
JustifyItemsCenter.displayName = "JustifyItemsCenter";
