import * as React from "react";
import type { IconProps } from "./types";

export const AlignItemsStretchIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M16 16H19.2V17.6H4.80005V16H8.00005V7.99999H4.80005V6.39999H19.2V7.99999H16V16ZM12.8 16V7.99999H11.2V16H12.8Z"
          fill={color}
        />
      </svg>
    );
  }
);
AlignItemsStretchIcon.displayName = "AlignItemsStretchIcon";
