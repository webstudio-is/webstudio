import * as React from "react";
import { IconProps } from "./types";

export const AlignItemsEndIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M16 16H19.2V17.6H4.80005V16H8.00005V9.59999H11.2V16H12.8V6.39999H16V16Z"
          fill={color}
        />
      </svg>
    );
  }
);
AlignItemsEndIcon.displayName = "AlignItemsEndIcon";
