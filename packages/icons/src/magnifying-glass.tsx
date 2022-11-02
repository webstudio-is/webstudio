import * as React from "react";
import { IconProps } from "./types";

export const MagnifyingGlassIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", ...props }, forwardedRef) => {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
        ref={forwardedRef}
      >
        <path
          fill-rule="evenodd"
          clip-rule="evenodd"
          d="M6.38912 10.67C7.12473 11.1939 8.02464 11.502 8.9965 11.502C11.4818 11.502 13.4965 9.48723 13.4965 7.00195C13.4965 4.51667 11.4818 2.50195 8.9965 2.50195C6.51122 2.50195 4.4965 4.51667 4.4965 7.00195C4.4965 7.97383 4.8046 8.87375 5.32845 9.60937L2.59467 12.3432C2.30178 12.636 2.30178 13.1109 2.59467 13.4038C2.88756 13.6967 3.36244 13.6967 3.65533 13.4038L6.38912 10.67ZM5.9965 7.00195C5.9965 8.65881 7.33965 10.002 8.9965 10.002C10.6534 10.002 11.9965 8.65881 11.9965 7.00195C11.9965 5.3451 10.6534 4.00195 8.9965 4.00195C7.33965 4.00195 5.9965 5.3451 5.9965 7.00195Z"
          fill={color}
        />
      </svg>
    );
  }
);

MagnifyingGlassIcon.displayName = "MagnifyingGlass";
