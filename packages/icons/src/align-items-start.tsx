import * as React from "react";
import type { IconProps } from "./types";

export const AlignItemsStartIcon = React.forwardRef<SVGSVGElement, IconProps>(
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
          d="M12.8 7.99999H11.2V14.4H8.00005V7.99999H4.80005V6.39999H19.2V7.99999H16V17.6H12.8V7.99999Z"
          fill={color}
        />
      </svg>
    );
  }
);
AlignItemsStartIcon.displayName = "AlignItemsStartIcon";
