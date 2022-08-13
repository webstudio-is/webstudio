import * as React from "react";
import { IconProps } from "./types";

// @todo this is just a copy of justifyContent icons for now
export const JustifyItemsEnd = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12 16.8H15.2V19.2H16.8V4.79999H15.2V7.19999H12V16.8Z"
          fill={color}
        />
        <path d="M7.19995 16.8H10.4V7.19999H7.19995V16.8Z" fill={color} />
      </svg>
    );
  }
);
JustifyItemsEnd.displayName = "JustifyItemsEnd";
