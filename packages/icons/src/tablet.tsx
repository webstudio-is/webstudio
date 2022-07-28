import * as React from "react";
import { IconProps } from "./types";

export const TabletIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          fill={color}
          d="M20 0H6C4.34 0 4 0.84 4 2.5V20.5C4 22.16 5.34 23.5 7 23.5H19C20.66 23.5 22 22.16 22 20.5V2.5C22 0.84 21.66 0 20 0ZM15 22.5H13H11V22H13H15V22.5ZM21 21H13H5V10.5V1H13H21V21Z"
        />
      </svg>
    );
  }
);

TabletIcon.displayName = "TabletIcon";
